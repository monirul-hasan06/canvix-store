export function formatBdt(amount: number): string {
  return `৳${amount.toLocaleString("en-BD")}`;
}

export function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value);
  }
  return new Promise((resolve, reject) => {
    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(input);
    if (ok) resolve();
    else reject(new Error("copy failed"));
  });
}

export const GMAIL_RE = /^[^\s@]+@(gmail|googlemail)\.com$/i;
export const BD_MOBILE_RE = /^01[3-9]\d{8}$/;
