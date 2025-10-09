export type Group = "All" | "E2T" | "Nish";

const KEY = "eas.accountGroups";

function read(): Record<string, Group> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function write(map: Record<string, Group>) {
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function getGroup(login_hint: string): Group {
  const m = read();
  return (m[login_hint] as Group) || "All";
}
export function setGroup(login_hint: string, group: Group) {
  const m = read();
  if (group === "All") delete m[login_hint]; else m[login_hint] = group;
  write(m);
}
