import { HoscordServer } from "@/models/HoscordServer";
import { v4 as uuid } from "uuid";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import CreateServerForm from "./CreateServerForm";
import { useChatContext } from "stream-chat-react";
import { Channel } from "stream-chat";
import { useHoscordContext } from "@/contexts/HoscordContext";

export default function ServerList(): JSX.Element {
  const { client } = useChatContext();

  const { server: activeServer, changeServer } = useHoscordContext();

  const [ServerList, setServerList] = useState<HoscordServer[]>([]);

  const loadServerList = useCallback(async (): Promise<void> => {
    const channels = await client.queryChannels({
      type: "messaging",
      members: { $in: [client.userID as string] },
    });
    const serverSet: Set<HoscordServer> = new Set(
      channels
        .map((channel: Channel) => {
          return {
            id: channel.data?.data?.id,
            name: (channel.data?.data?.server as string) ?? "Unknown",
            image: channel.data?.data?.image,
          };
        })
        .filter((server: HoscordServer) => server.name !== "Unknown")
        .filter(
          (server: HoscordServer, index, self) =>
            index ===
            self.findIndex((serverObject) => serverObject.name == server.name)
        )
    );
    const serverArray = Array.from(serverSet.values());
    setServerList(serverArray);
    if (serverArray.length > 0) {
      changeServer(serverArray[0], client);
    }
  }, [client, changeServer]);

  useEffect(() => {
    loadServerList();
  }, [loadServerList]);

  return (
    <div className="bg-dark-gray h-full flex flex-col items-center">
      <button
        className={`block p-3 aspect-square sidebar-icon boder-b-2 border-b-gray-300 ${
          activeServer === undefined ? "selected-icon" : ""
        }`}
        onClick={() => changeServer(undefined, client)}
      >
        <div className="rounded-icon hoscord-icon" />
      </button>
      {ServerList.map((server) => (
        <button
          key={server.id}
          className={`p-2 sidebar-icon ${
            server.id === activeServer?.id ? "selected-icon" : ""
          }`}
          onClick={() => changeServer(server, client)}
        >
          {server.image && checkIfUrl(server.image) ? (
            <Image
              className="rounded-icon"
              src={server.image}
              width={50}
              height={50}
              alt="Server Icon"
            />
          ) : (
            <span className="rounded-icon bg-gray-600 w-[50px] flex items-center justify-center text-sm">
              {server.name.charAt(0)}
            </span>
          )}
        </button>
      ))}
      <Link
        href={"/?createServer=true"}
        className="flex items-center justify-center rounded-icon bg-white p-2 my-2 text-2xl font-light h-12 w-12 text-orange-500 hover:bg-orange-500 hover:text-white hover:rounded-xl transition-all duration-200"
      >
        <span className="inline-block">+</span>
      </Link>
      <CreateServerForm />
    </div>
  );

  function checkIfUrl(path: string): Boolean {
    try {
      const _ = new URL(path);
      return true;
    } catch (_) {
      return false;
    }
  }
}
