/** @type {import('next').NextConfig} */
const nextConfig = {
  // The dev-only overlay sits bottom-left, on top of the carousel's own
  // corner. Compile and runtime errors are still surfaced without it.
  devIndicators: false,
};

export default nextConfig;
