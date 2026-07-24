import { useMutation, useQuery } from "@apollo/client/react";
import {
  launchImageLibraryAsync,
  requestMediaLibraryPermissionsAsync,
} from "expo-image-picker";
import { readFragment } from "gql.tada";
import {
  Avatar,
  BottomSheet,
  Button,
  Chip,
  Dialog,
  Input,
  Label,
  ListGroup,
  Separator,
  Spinner,
  TextField,
  Typography,
  useToast,
} from "heroui-native";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, View } from "react-native";

import { createOrganization } from "@/features/auth/create-organization";
import { slugifyOrganizationName } from "@/features/auth/onboarding-form.schema";
import { OrganizationListItemFragment } from "@/features/dashboard/organization/graphql/fragments";
import {
  DeleteOrganizationDocument,
  UpdateOrganizationDocument,
} from "@/features/dashboard/organization/graphql/mutations";
import { ListOrganizationsDocument } from "@/features/dashboard/organization/graphql/queries";
import { getActiveOrganizationId } from "@/lib/active-organization";
import { authClient } from "@/lib/auth-client";
import { haptics } from "@/lib/haptics";

type MemberView = {
  email: string;
  id: string;
  name: string;
  role: string;
  userId: string;
};
type InvitationView = {
  email: string;
  id: string;
  role: string;
};
type UploadFile = { name: string; type: string; uri: string };

export function ManageOrgScreen() {
  const { data: session, refetch: refetchSession } = authClient.useSession();
  const organizationId = getActiveOrganizationId(session);
  const organizations = useQuery(ListOrganizationsDocument);
  const [members, setMembers] = useState<MemberView[]>([]);
  const [invitations, setInvitations] = useState<InvitationView[]>([]);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { toast } = useToast();

  const refreshAdministration = useCallback(async () => {
    if (organizationId === null) {
      return;
    }
    setAdminLoading(true);
    setAdminError(undefined);
    const [memberResult, invitationResult] = await Promise.all([
      authClient.organization.listMembers({
        query: { limit: 100, organizationId },
      }),
      authClient.organization.listInvitations({
        query: { organizationId },
      }),
    ]);
    if (memberResult.error || invitationResult.error) {
      setAdminError(
        memberResult.error?.message ??
          invitationResult.error?.message ??
          "Unable to load workspace administration."
      );
    }
    setMembers(
      (memberResult.data?.members ?? []).map((member) => ({
        email: member.user.email,
        id: member.id,
        name: member.user.name,
        role: member.role,
        userId: member.userId,
      }))
    );
    setInvitations(
      (invitationResult.data ?? [])
        .filter((invitation) => invitation.status === "pending")
        .map((invitation) => ({
          email: invitation.email,
          id: invitation.id,
          role: invitation.role,
        }))
    );
    setAdminLoading(false);
  }, [organizationId]);

  useEffect(() => {
    refreshAdministration().catch(() => {
      setAdminError("Unable to load workspace administration.");
      setAdminLoading(false);
    });
  }, [refreshAdministration]);

  const organizationRefs = organizations.data?.organizations ?? [];
  const activeOrganizationRef = organizationRefs.find(
    (organization) =>
      readFragment(OrganizationListItemFragment, organization).id ===
      organizationId
  );
  const activeOrganization =
    activeOrganizationRef === undefined
      ? undefined
      : readFragment(OrganizationListItemFragment, activeOrganizationRef);
  const currentMember = members.find(
    (member) => member.userId === session?.user.id
  );
  const roles = currentMember?.role.split(",").map((role) => role.trim()) ?? [];
  const isOwner = roles.includes("owner");
  const canManage = isOwner || roles.includes("admin");

  if (organizationId === null) {
    return null;
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-7 p-5 pb-safe-offset-10"
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <Typography.Heading className="text-2xl">Workspaces</Typography.Heading>
          <Typography className="text-muted">
            Switch context and manage your team.
          </Typography>
        </View>
        <Button onPress={() => setCreateOpen(true)} size="sm">
          <Button.Label>New</Button.Label>
        </Button>
      </View>

      <View className="gap-2">
        <Typography className="ml-2 font-medium text-muted text-sm">
          Your workspaces
        </Typography>
        <ListGroup variant="secondary">
          {organizationRefs.map((organization, index) => {
            const item = readFragment(
              OrganizationListItemFragment,
              organization
            );
            const active = item.id === organizationId;
            return (
              <View key={item.id}>
                {index === 0 ? null : <Separator className="mx-4" />}
                <ListGroup.Item
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  className="min-h-16"
                  onPress={async () => {
                    if (active) {
                      return;
                    }
                    const result = await authClient.organization.setActive({
                      organizationId: item.id,
                    });
                    if (result.error) {
                      toast.show({
                        label:
                          result.error.message ??
                          "Unable to switch workspace.",
                        variant: "danger",
                      });
                      return;
                    }
                    await Promise.all([
                      organizations.refetch(),
                      refetchSession(),
                    ]);
                    haptics.success();
                  }}
                >
                  <ListGroup.ItemPrefix>
                    <Avatar alt={item.name} size="sm">
                      {item.imageThumb ? (
                        <Avatar.Image source={{ uri: item.imageThumb }} />
                      ) : null}
                      <Avatar.Fallback>
                        {item.name.charAt(0).toUpperCase()}
                      </Avatar.Fallback>
                    </Avatar>
                  </ListGroup.ItemPrefix>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle>{item.name}</ListGroup.ItemTitle>
                    <ListGroup.ItemDescription>
                      {item.slug}
                    </ListGroup.ItemDescription>
                  </ListGroup.ItemContent>
                  <ListGroup.ItemSuffix>
                    {active ? (
                      <Chip color="success" size="sm" variant="soft">
                        <Chip.Label>Active</Chip.Label>
                      </Chip>
                    ) : null}
                  </ListGroup.ItemSuffix>
                </ListGroup.Item>
              </View>
            );
          })}
        </ListGroup>
      </View>

      {activeOrganization === undefined ? null : (
        <View className="gap-3 rounded-3xl bg-surface-secondary p-5">
          <View className="flex-row items-center justify-between">
            <View className="min-w-0 flex-1">
              <Typography className="font-semibold text-lg">
                {activeOrganization.name}
              </Typography>
              <Typography className="text-muted text-sm">
                {activeOrganization.slug} · {currentMember?.role ?? "member"}
              </Typography>
            </View>
            {canManage ? (
              <Button
                onPress={() => setEditOpen(true)}
                size="sm"
                variant="secondary"
              >
                <Button.Label>Edit</Button.Label>
              </Button>
            ) : null}
          </View>
        </View>
      )}

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Typography.Heading className="text-xl">Members</Typography.Heading>
          {canManage ? (
            <Button onPress={() => setInviteOpen(true)} size="sm">
              <Button.Label>Invite</Button.Label>
            </Button>
          ) : null}
        </View>
        {adminLoading ? (
          <View className="items-center py-6">
            <Spinner />
          </View>
        ) : adminError ? (
          <View className="gap-3 rounded-2xl bg-danger-soft p-4">
            <Typography className="text-danger-soft-foreground">
              {adminError}
            </Typography>
            <Button onPress={refreshAdministration} size="sm" variant="secondary">
              <Button.Label>Retry</Button.Label>
            </Button>
          </View>
        ) : (
          <ListGroup variant="secondary">
            {members.map((member, index) => (
              <View key={member.id}>
                {index === 0 ? null : <Separator className="mx-4" />}
                <ListGroup.Item className="min-h-16" disabled>
                  <ListGroup.ItemPrefix>
                    <Avatar alt={member.name} size="sm">
                      <Avatar.Fallback>
                        {member.name.charAt(0).toUpperCase()}
                      </Avatar.Fallback>
                    </Avatar>
                  </ListGroup.ItemPrefix>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle>
                      {member.name}
                    </ListGroup.ItemTitle>
                    <ListGroup.ItemDescription>
                      {member.email}
                    </ListGroup.ItemDescription>
                  </ListGroup.ItemContent>
                  <ListGroup.ItemSuffix>
                    <Chip
                      color={member.role.includes("owner") ? "accent" : "default"}
                      size="sm"
                      variant="soft"
                    >
                      <Chip.Label>{member.role}</Chip.Label>
                    </Chip>
                  </ListGroup.ItemSuffix>
                </ListGroup.Item>
                {canManage &&
                member.userId !== session?.user.id &&
                !member.role.includes("owner") ? (
                  <View className="flex-row justify-end gap-2 px-3 pb-3">
                    <Button
                      onPress={async () => {
                        const nextRole = member.role.includes("admin")
                          ? "member"
                          : "admin";
                        const result =
                          await authClient.organization.updateMemberRole({
                            memberId: member.id,
                            organizationId,
                            role: nextRole,
                          });
                        if (result.error) {
                          toast.show({
                            label:
                              result.error.message ?? "Unable to update role.",
                            variant: "danger",
                          });
                          return;
                        }
                        await refreshAdministration();
                      }}
                      size="sm"
                      variant="secondary"
                    >
                      <Button.Label>
                        {member.role.includes("admin")
                          ? "Make member"
                          : "Make admin"}
                      </Button.Label>
                    </Button>
                    <Button
                      onPress={async () => {
                        const result = await authClient.organization.removeMember(
                          {
                            memberIdOrEmail: member.id,
                            organizationId,
                          }
                        );
                        if (result.error) {
                          toast.show({
                            label:
                              result.error.message ?? "Unable to remove member.",
                            variant: "danger",
                          });
                          return;
                        }
                        await refreshAdministration();
                      }}
                      size="sm"
                      variant="danger-soft"
                    >
                      <Button.Label>Remove</Button.Label>
                    </Button>
                  </View>
                ) : null}
              </View>
            ))}
          </ListGroup>
        )}
      </View>

      {canManage && invitations.length > 0 ? (
        <View className="gap-3">
          <Typography.Heading className="text-xl">
            Pending invitations
          </Typography.Heading>
          <ListGroup variant="secondary">
            {invitations.map((invitation, index) => (
              <View key={invitation.id}>
                {index === 0 ? null : <Separator className="mx-4" />}
                <ListGroup.Item disabled>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle>
                      {invitation.email}
                    </ListGroup.ItemTitle>
                    <ListGroup.ItemDescription>
                      Invited as {invitation.role}
                    </ListGroup.ItemDescription>
                  </ListGroup.ItemContent>
                </ListGroup.Item>
                <View className="flex-row justify-end gap-2 px-3 pb-3">
                  <Button
                    onPress={async () => {
                      await authClient.organization.inviteMember({
                        email: invitation.email,
                        organizationId,
                        resend: true,
                        role: invitation.role as "admin" | "member",
                      });
                      toast.show({
                        label: "Invitation resent",
                        variant: "success",
                      });
                    }}
                    size="sm"
                    variant="secondary"
                  >
                    <Button.Label>Resend</Button.Label>
                  </Button>
                  <Button
                    onPress={async () => {
                      await authClient.organization.cancelInvitation({
                        invitationId: invitation.id,
                      });
                      await refreshAdministration();
                    }}
                    size="sm"
                    variant="danger-soft"
                  >
                    <Button.Label>Cancel</Button.Label>
                  </Button>
                </View>
              </View>
            ))}
          </ListGroup>
        </View>
      ) : null}

      {isOwner && activeOrganization !== undefined ? (
        <View className="gap-3 rounded-3xl bg-danger-soft p-5">
          <Typography className="font-semibold text-danger-soft-foreground">
            Danger zone
          </Typography>
          <Typography className="text-danger-soft-foreground text-sm">
            Deleting a workspace permanently removes its tasks and membership.
          </Typography>
          <Button
            onPress={() => setDeleteOpen(true)}
            variant="danger"
          >
            <Button.Label>Delete workspace</Button.Label>
          </Button>
        </View>
      ) : null}

      <CreateWorkspaceSheet
        isOpen={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={async () => {
          setCreateOpen(false);
          await Promise.all([organizations.refetch(), refetchSession()]);
        }}
      />
      <InviteMemberSheet
        isOpen={inviteOpen}
        onOpenChange={setInviteOpen}
        onSuccess={refreshAdministration}
        organizationId={organizationId}
      />
      {activeOrganization === undefined ? null : (
        <>
          <EditWorkspaceSheet
            isOpen={editOpen}
            onOpenChange={setEditOpen}
            onSuccess={() => organizations.refetch()}
            organization={activeOrganization}
          />
          <DeleteWorkspaceDialog
            isOpen={deleteOpen}
            onOpenChange={setDeleteOpen}
            onSuccess={async () => {
              await Promise.all([organizations.refetch(), refetchSession()]);
            }}
            organizationId={activeOrganization.id}
            organizationName={activeOrganization.name}
          />
        </>
      )}
    </ScrollView>
  );
}

function CreateWorkspaceSheet({
  isOpen,
  onOpenChange,
  onSuccess,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [pending, setPending] = useState(false);
  const { toast } = useToast();

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content className="gap-5 pb-safe-offset-5" keyboardBehavior="extend">
          <BottomSheet.Close />
          <BottomSheet.Title>Create workspace</BottomSheet.Title>
          <TextField isRequired>
            <Label>Name</Label>
            <Input
              onChangeText={(value) => {
                setName(value);
                setSlug(slugifyOrganizationName(value));
              }}
              value={name}
            />
          </TextField>
          <TextField isRequired>
            <Label>Slug</Label>
            <Input
              autoCapitalize="none"
              onChangeText={setSlug}
              value={slug}
            />
          </TextField>
          <Button
            isDisabled={pending || !name.trim() || !slug.trim()}
            onPress={async () => {
              setPending(true);
              const result = await createOrganization({ name, slug });
              setPending(false);
              if (!result.ok) {
                toast.show({ label: result.message, variant: "danger" });
                return;
              }
              setName("");
              setSlug("");
              await onSuccess();
            }}
          >
            {pending ? <Spinner color="default" size="sm" /> : null}
            <Button.Label>
              {pending ? "Creating workspace…" : "Create workspace"}
            </Button.Label>
          </Button>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

function EditWorkspaceSheet({
  isOpen,
  onOpenChange,
  onSuccess,
  organization,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => Promise<unknown>;
  organization: {
    id: string;
    imageThumb: string | null;
    name: string;
    slug: string;
  };
}) {
  const [name, setName] = useState(organization.name);
  const [slug, setSlug] = useState(organization.slug);
  const [logo, setLogo] = useState<UploadFile>();
  const [updateOrganization, { loading }] = useMutation(
    UpdateOrganizationDocument
  );
  const { toast } = useToast();

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content className="gap-5 pb-safe-offset-5" keyboardBehavior="extend">
          <BottomSheet.Close />
          <BottomSheet.Title>Edit workspace</BottomSheet.Title>
          <View className="items-center gap-3">
            <Avatar alt={name} color="accent" size="lg">
              {logo?.uri || organization.imageThumb ? (
                <Avatar.Image
                  source={{ uri: logo?.uri ?? organization.imageThumb ?? "" }}
                />
              ) : null}
              <Avatar.Fallback>{name.charAt(0).toUpperCase()}</Avatar.Fallback>
            </Avatar>
            <Button
              onPress={async () => {
                const permission = await requestMediaLibraryPermissionsAsync();
                if (!permission.granted) {
                  toast.show({
                    label: "Photo access is required to choose a logo.",
                    variant: "warning",
                  });
                  return;
                }
                const result = await launchImageLibraryAsync({
                  allowsEditing: true,
                  aspect: [1, 1],
                  mediaTypes: ["images"],
                  quality: 0.85,
                });
                const asset = result.canceled ? undefined : result.assets[0];
                if (asset !== undefined) {
                  setLogo({
                    name: asset.fileName ?? "workspace-logo.jpg",
                    type: asset.mimeType ?? "image/jpeg",
                    uri: asset.uri,
                  });
                }
              }}
              size="sm"
              variant="secondary"
            >
              <Button.Label>Choose logo</Button.Label>
            </Button>
          </View>
          <TextField isRequired>
            <Label>Name</Label>
            <Input onChangeText={setName} value={name} />
          </TextField>
          <TextField isRequired>
            <Label>Slug</Label>
            <Input
              autoCapitalize="none"
              onChangeText={setSlug}
              value={slug}
            />
          </TextField>
          <Button
            isDisabled={loading || !name.trim() || !slug.trim()}
            onPress={async () => {
              try {
                await updateOrganization({
                  variables: {
                    input: {
                      logo,
                      name: name.trim(),
                      organizationId: organization.id,
                      slug: slug.trim(),
                    },
                  },
                });
                await onSuccess();
                haptics.success();
                onOpenChange(false);
              } catch (error) {
                toast.show({
                  label:
                    error instanceof Error
                      ? error.message
                      : "Unable to update workspace.",
                  variant: "danger",
                });
              }
            }}
          >
            {loading ? <Spinner color="default" size="sm" /> : null}
            <Button.Label>{loading ? "Saving…" : "Save workspace"}</Button.Label>
          </Button>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

function DeleteWorkspaceDialog({
  isOpen,
  onOpenChange,
  onSuccess,
  organizationId,
  organizationName,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => Promise<void>;
  organizationId: string;
  organizationName: string;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [deleteOrganization, { loading }] = useMutation(
    DeleteOrganizationDocument
  );

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content className="gap-4">
          <Dialog.Close />
          <Dialog.Title>Delete {organizationName}?</Dialog.Title>
          <Dialog.Description>
            Type “{organizationName}” to permanently delete this workspace.
          </Dialog.Description>
          <TextField>
            <Label>Workspace name</Label>
            <Input onChangeText={setConfirmation} value={confirmation} />
          </TextField>
          <Button
            isDisabled={loading || confirmation !== organizationName}
            onPress={async () => {
              await deleteOrganization({
                variables: { input: { organizationId } },
              });
              onOpenChange(false);
              await onSuccess();
            }}
            variant="danger"
          >
            {loading ? <Spinner color="default" size="sm" /> : null}
            <Button.Label>
              {loading ? "Deleting workspace…" : "Delete permanently"}
            </Button.Label>
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

function InviteMemberSheet({
  isOpen,
  onOpenChange,
  organizationId,
  onSuccess,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [pending, setPending] = useState(false);
  const { toast } = useToast();

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content className="gap-5 pb-safe-offset-5" keyboardBehavior="extend">
          <BottomSheet.Close />
          <BottomSheet.Title>Invite a member</BottomSheet.Title>
          <BottomSheet.Description>
            They’ll receive a secure invitation that expires in 48 hours.
          </BottomSheet.Description>
          <TextField isRequired>
            <Label>Email</Label>
            <Input
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              value={email}
            />
          </TextField>
          <View className="flex-row gap-2">
            {(["member", "admin"] as const).map((option) => (
              <Chip
                color={role === option ? "accent" : "default"}
                key={option}
                onPress={() => setRole(option)}
                variant="soft"
              >
                <Chip.Label>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Chip.Label>
              </Chip>
            ))}
          </View>
          <Button
            isDisabled={pending || !email.includes("@")}
            onPress={async () => {
              setPending(true);
              const result = await authClient.organization.inviteMember({
                email: email.trim(),
                organizationId,
                role,
              });
              setPending(false);
              if (result.error) {
                toast.show({
                  label:
                    result.error.message ?? "Unable to send invitation.",
                  variant: "danger",
                });
                return;
              }
              haptics.success();
              toast.show({ label: "Invitation sent", variant: "success" });
              setEmail("");
              onOpenChange(false);
              await onSuccess();
            }}
          >
            {pending ? <Spinner color="default" size="sm" /> : null}
            <Button.Label>
              {pending ? "Sending invitation…" : "Send invitation"}
            </Button.Label>
          </Button>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
