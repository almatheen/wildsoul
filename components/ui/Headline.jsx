/**
 * Editorial headline split into masked lines so the motion layer can reveal them one by one.
 * `lines` is an array; each line is a string or an array of strings / { em: string }.
 * Server component: output is plain, readable HTML even without JavaScript.
 */
function renderLine(line) {
  const parts = Array.isArray(line) ? line : [line];
  return parts.map((p, i) =>
    typeof p === 'string' ? <span key={i} className="contents">{p}</span> : <em key={i}>{p.em}</em>
  );
}

export default function Headline({ as: Tag = 'h2', lines, className = '', hero = false, id }) {
  const attr = hero ? { 'data-hero-lines': '' } : { 'data-lines': '' };
  return (
    <Tag id={id} className={`serif ${className}`} {...attr}>
      {lines.map((line, i) => (
        <span className="line" key={i}>
          <span>{renderLine(line)}</span>
        </span>
      ))}
    </Tag>
  );
}
