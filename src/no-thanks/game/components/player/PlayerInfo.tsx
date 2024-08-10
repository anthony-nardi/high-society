export default function PlayerInfo({ email }: { email: string }) {
  return <b>{email.split("@")[0]}</b>;
}
