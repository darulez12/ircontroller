import { createFileRoute } from "@tanstack/react-router";
import { RemoteApp } from "@/components/remote/remote-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <RemoteApp />;
}
