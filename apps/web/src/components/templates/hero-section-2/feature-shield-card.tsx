import { IconShield } from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";

export function FeatureShieldCard() {
  return (
    <Card className="card variant-outlined relative col-span-full overflow-hidden lg:col-span-3">
      <CardContent className="grid pt-6 sm:grid-cols-2">
        <div className="relative z-10 flex flex-col justify-between space-y-12 lg:space-y-6">
          <div className="relative flex aspect-square size-12 rounded-full border before:absolute before:-inset-2 before:rounded-full before:border dark:border-white/10 dark:before:border-white/5">
            <IconShield className="m-auto size-5" strokeWidth={1} />
          </div>
          <div className="space-y-2">
            <h2 className="font-medium text-lg text-zinc-800 transition group-hover:text-secondary-950 dark:text-white">
              Faster than light
            </h2>
            <p className="text-foreground">
              Provident fugit vero voluptate. Voluptates a sapiente inventore
              nisi.
            </p>
          </div>
        </div>
        <div className="relative mt-6 -mr-6 -mb-6 h-fit rounded-tl-(--radius) border-t border-l p-6 py-6 sm:ml-6">
          <div className="absolute top-2 left-3 flex gap-1">
            <span className="block size-2 rounded-full border dark:border-white/10 dark:bg-white/10" />
            <span className="block size-2 rounded-full border dark:border-white/10 dark:bg-white/10" />
            <span className="block size-2 rounded-full border dark:border-white/10 dark:bg-white/10" />
          </div>
          <svg
            aria-label="Hero Features"
            className="w-full sm:w-[150%]"
            fill="none"
            viewBox="0 0 366 231"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              clipRule="evenodd"
              d="M0.1 231V179.4L1.9 180.3L2.9 177.7L4.1 183.9L6.8 179L7.4 184.3L9.4 188L11.1 191.3V155.5L13.6 153V145.1L14.2 142.8V150.5V154.8L15.6 160.8L17.1 172.2H19.2V158.2L20.7 153L22.4 148.1V142.4L24.7 146.9V128.4L26.8 129.9V120.9L28.1 118.5L28.5 127.4L29.2 123.8L31 120.5V130.3L32.4 134.7L34.4 145.1V137.5L35.9 130.3L37.2 126L38.7 134.7L40.7 139V130.3V126L43.8 130.3V123.8L46 112.4L47.3 103.4V92.5L49.2 98.5V106.1L52.6 89.8L54.5 82.8L56.1 88L58.9 89.8V98.5L60.8 103.4L62.1 123.8L63.9 118.1L65.6 122.1L68.5 114.2L70.3 109.7L71.9 118.1L73.6 123.8V130.3L74.9 134.9L76.9 127.9L78.4 134.7V139L80.1 142.4V152.6L83 142.4V130.3L86.8 123.8L89 116.6V122.1L90.6 127.9L92.4 131.8L93.7 123.8L95.5 118.1L96.8 122.1V137.5L99.7 141V131.8L101.7 120.5L103 116.6V133.3L104.9 136.2L107 141L108.9 134.7L110.8 130.3L112.9 141V148.1L115.7 152.6L117.9 145.1L120 141V148.1L123.4 152.6L125.4 158.2L130.5 150.5V156.6L131.6 155.5L134.1 158.2L135.6 168.1L138.3 158.2L140.6 160.8L144.7 169.5L147 155.5L148.5 151.8L151 152.6L154.9 145.1L158 143.4L159.4 140.6L159.5 133.3L162.3 127.9V122.1L163.9 116.6V109.7L164.8 104.4L166.9 109.7L176.2 98.5L178.3 106.2L180.8 98.5V81L182.9 69.2L184.8 56.9L186.5 62.8L187.8 79.7L188.8 106.2L191.4 79.7L193.5 75.6V98.5L196.6 94.5L198.6 87.4V79.7L200.7 75.6L202.3 81V89.4L203.6 113L205.3 99.8L207.2 94.5L209 98.5V102.2L211.3 107.6L212.8 81L214.4 66L216.2 62.8L217.9 56.9V73.7V79.7L220.3 75.6L222.5 66V73.7H226.2V84.9L228.6 98.5L230.3 75.6L233.6 94.5V104.3L236.9 102.2L239.5 113L241.1 98.5L243.6 94.5L245 106.2L246 87.4L247.3 89.4L250.7 84.9L251.7 96.8L254.6 94.5L257.5 99.8L259.9 91.3L261.2 84.9L264.2 75.6L265.8 87.4L267.2 58.5L269.8 66L276.6 13.5L273.3 58.5L276.3 67.7L282.4 20.2L281.4 58.5V66L283.6 75.6L286 56.9L287.4 73.7L290.6 77.7L292.4 84.9L294.2 61.4L296.2 19L300.8 0.9L297.5 56.9L300 62.8L305.5 22.1L299.8 115L301.9 105.4L304.2 112.7V95L308 80.1L310 95L311 102.1L312.4 105.4L315 112.7L316.9 98L318.9 105.4L321.3 95L324.3 100.8L325 80.1L327.6 61.6L329.3 82.3L333.5 52.8L334.1 52.1L334.7 55.7L337.4 59.8V73.7L340.7 88L343.8 96.4L348.6 82.8L349.6 81L351 89.8L352.6 96.4L355.1 95L356.7 102.2L359.4 108.8L360.7 111.8L365 95.8V231H148.5H0.1Z"
              fill="url(#paint0_linear_0_705)"
              fillRule="evenodd"
            />
            <path
              className="text-primary-600 dark:text-primary-500"
              d="M1 179.8L4.1 172.2V183.9L7.2 174.4L8.5 183.9L10.1 186.9V155.5L12.6 152.6V145.1L15.3 134.7V149.8V155.5L16.7 160.8L18.1 172.2V158.2L19.8 152.6L21.4 148.1V137.5L23.7 142.4V126L25.8 127.9V120.5L27.3 118.1L29.2 112.4V123.8L31 120.5V130.3L32.4 134.7L34.4 145.1V137.5L35.9 130.3L37.2 126L38.7 134.7L40.7 139V130.3V126L43.8 130.3V123.8L46 112.4L47.3 103.4V92.5L49.2 98.5V106.1L52.6 89.8L54.5 82.8L56.1 88L58.9 89.8V98.5L60.8 103.4L62.1 123.8L63.9 118.1L65.6 122.1L68.5 114.2L70.3 109.7L71.9 118.1L73.6 123.8V130.3L74.9 134.9L76.9 127.9L78.4 134.7V139L80.1 142.4V152.6L83 142.4V130.3L86.8 123.8L89 116.6V122.1L90.6 127.9L92.4 131.8L93.7 123.8L95.5 118.1L96.8 122.1V137.5L99.7 141V131.8L101.7 120.5L103 116.6V133.3L104.9 136.2L107 141L108.9 134.7L110.8 130.3L112.9 141V148.1L115.7 152.6L117.9 145.1L120 141L121.5 148.1L123.4 152.6L125.4 158.2L128 152.6L131.6 146.8V155.5L134.1 158.2L135.8 164.6L138.3 158.2L140.6 160.8L144.1 166.8L146.1 155.5L147.8 149.8L151 152.6L154.9 145.1L158.5 141V133.3L161.3 127.9V122.1L162.9 116.6V109.7L164.8 103.4L166.9 109.7L176.2 98.5L178.3 106.2L180.8 98.5V81L182.9 69.2L184.8 56.9L186.5 62.8L187.8 79.7L188.8 106.2L191.4 79.7L193.5 75.6V98.5L196.6 94.5L198.6 87.4V79.7L200.7 75.6L202.3 81V89.4L203.6 113L205.3 99.8L207.2 94.5L209 98.5V102.2L211.3 107.6L212.8 81L214.4 66L216.2 62.8L217.9 56.9V73.7V79.7L220.3 75.6L222.5 66V73.7H226.2V84.9L228.6 98.5L230.3 75.6L233.6 94.5V104.3L236.9 102.2L239.5 113L241.1 98.5L243.6 94.5L245 106.2L246 87.4L247.3 89.4L250.7 84.9L251.7 96.8L254.6 94.5L257.5 99.8L259.9 91.3L261.2 84.9L264.2 75.6L265.8 87.4L267.2 58.5L269.8 66L276.6 13.5L273.3 58.5L276.3 67.7L282.4 20.2L281.4 58.5V66L283.6 75.6L286 56.9L287.4 73.7L290.6 77.7L292.4 84.9L294.2 61.4L296.2 19L300.8 0.9L297.5 56.9L300 62.8L305.5 22.1L299.8 115L301.9 105.4L304.2 112.7V95L308 80.1L310 95L311 102.1L312.4 105.4L315 112.7L316.9 98L318.9 105.4L321.3 95L324.3 100.8L325 80.1L327.6 61.6L329.4 75L332.6 52.7L334.4 48.6L335.8 55.3L338.4 59.6V73.4L341.7 87.5L343.8 93.4L347.7 82.1L350.2 78.7L352 89.8L353.3 95L355.8 93.4L357.8 102.1L360.7 108.8L363.2 98L365 89.8"
              stroke="currentColor"
              strokeWidth="2"
            />
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="paint0_linear_0_705"
                x1="0.85108"
                x2="0.85108"
                y1="0.947876"
                y2="230.114"
              >
                <stop
                  className="text-primary/15 dark:text-primary/35"
                  stopColor="currentColor"
                />
                <stop
                  className="text-transparent"
                  offset="1"
                  stopColor="currentColor"
                  stopOpacity="0.01"
                />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
