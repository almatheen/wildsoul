// A template re-mounts on every navigation, which replays this quick CSS fade.
export default function Template({ children }) {
  return <div className="page-in">{children}</div>;
}
