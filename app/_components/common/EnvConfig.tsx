export { };

declare global {
  interface Window {
    __ENV__: {
      API_URL?: string;
    };
  }
}

export function EnvConfig() {
  const env = {
    API_URL: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL,
  };

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.__ENV__ = ${JSON.stringify(env)}`,
      }}
    />
  );
}
