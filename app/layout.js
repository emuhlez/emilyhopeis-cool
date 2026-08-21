import "./globals.css";

export const metadata = {
  title: "Emily Hope — Product Designer",
  description:
    "Emily Hope designs agentic experiences and AI-native products.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
