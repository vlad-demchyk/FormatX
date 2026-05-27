export function BootError() {
  return (
    <div
      className="boot-error"
      style={{
        padding: 24,
        fontFamily: "system-ui",
        maxWidth: 480,
        margin: "40px auto",
      }}
    >
      <h1 style={{ fontSize: "1.25rem", margin: "0 0 12px" }}>FormatX</h1>
      <p style={{ color: "#5f6368", margin: "0 0 16px" }}>
        Не вдалося запустити застосунок.
      </p>
    </div>
  );
}
