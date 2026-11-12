import styles from "./history.module.css";

// [ADD ...] on the Fund History page; the IPS page also uses [TO DECIDE: Qn] and a few blanks
const PLACEHOLDER = /(\[(?:ADD|TO DECIDE|DATE|FOR|AGAINST|ABSTAIN|SIGNATURE)[^\]]*\])/;

/** True for text that is nothing but an unfilled [ADD ...] placeholder. */
export function isPlaceholder(text: string): boolean {
  return /^\[ADD [^\]]+\]$/.test(text.trim());
}

/**
 * Renders content text, outlining any [ADD ...] placeholder still in it so
 * unfinished facts are obvious on the page (see content/fund-history.ts).
 */
export function Fill({ text }: { text: string }) {
  return (
    <>
      {text.split(PLACEHOLDER).map((part, i) =>
        PLACEHOLDER.test(part) ? (
          <span key={i} className={styles.ph}>
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
