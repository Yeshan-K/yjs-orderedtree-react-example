import "./globals.css";

export const metadata = {
  title: "y-orderedtree Next/React Example",
  description: "Generated by create next app",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <body
        className={`antialiased vsc-initialized w-[100hh] h-[100vh]`}
      >
        {children}
      </body>
    </html>
  );
}
