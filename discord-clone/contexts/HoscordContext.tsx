"use client";

import { HoscordServer } from "@/models/HoscordServer";
import { MemberRequest, StreamVideoClient } from "@stream-io/video-react-sdk";
import { createContext, useCallback, useContext, useState } from "react";
import { Channel, ChannelFilters, StreamChat } from "stream-chat";
import { DefaultStreamChatGenerics } from "stream-chat-react";
import { v4 as uuid } from "uuid";

type HoscordState = {
  server?: HoscordServer;
  callId: string | undefined;
  channelsByCategories: Map<string, Array<Channel<DefaultStreamChatGenerics>>>;
  changeServer: (server: HoscordServer | undefined, client: StreamChat) => void;
  createServer: (
    client: StreamChat,
    videoClient: StreamVideoClient,
    name: string,
    imageUrl: string,
    userIds: string[]
  ) => void;
  createChannel: (
    client: StreamChat,
    name: string,
    category: string,
    userIds: string[]
  ) => void;
  createCall: (
    client: StreamVideoClient,
    server: HoscordServer,
    channelName: string,
    userIds: string[]
  ) => Promise<void>;
  setCall: (callId: string | undefined) => void;
}; // Keep your state type as it is.

const initialValue: HoscordState = {
  server: undefined,
  callId: undefined,
  channelsByCategories: new Map(),
  changeServer: () => {},
  createServer: () => {},
  createChannel: () => {},
  createCall: async () => {},
  setCall: () => {},
}; // Initial value for the state.

// Rename the context variable to avoid name conflict with the type.
const HoscordContext = createContext<HoscordState>(initialValue);

export const HoscordContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [myState, setMyState] = useState<HoscordState>(initialValue);

  const changeServer = useCallback(
    async (server: HoscordServer | undefined, client: StreamChat) => {
      let filters: ChannelFilters = {
        type: "messaging",
        members: { $in: [client.userID as string] },
      };
      if (!server) {
        filters.member_count = 2;
      }

      const channels = await client.queryChannels(filters);
      const channelsByCategories = new Map<
        string,
        Array<Channel<DefaultStreamChatGenerics>>
      >();
      if (server) {
        const categories = new Set(
          channels
            .filter((channel) => {
              return channel.data?.data?.server === server.name;
            })
            .map((channel) => {
              return channel.data?.data?.category;
            })
        );

        for (const category of Array.from(categories)) {
          channelsByCategories.set(
            category,
            channels.filter((channel) => {
              return (
                channel.data?.data?.server === server.name &&
                channel.data?.data?.category === category
              );
            })
          );
        }
      } else {
        channelsByCategories.set("Direct Messages", channels);
      }

      setMyState((myState) => {
        return { ...myState, server, channelsByCategories };
      });
    },
    [setMyState]
  );

  const createCall = useCallback(
    async (
      client: StreamVideoClient,
      server: HoscordServer,
      channelName: string,
      userIds: string[]
    ) => {
      const callId = uuid();
      const audioCall = client.call("default", callId);
      const audioChannelMembers: MemberRequest[] = userIds.map((userId) => {
        return {
          user_id: userId,
        };
      });
      try {
        const createdAudioCall = await audioCall.create({
          data: {
            custom: {
              serverId: server?.id,
              serverName: server?.name,
              callName: channelName,
            },
            members: audioChannelMembers,
          },
        });
        console.log(
          `[HoscordContext] Created Call with ID: ${createdAudioCall.call.id}`
        );
      } catch (err) {
        console.log(err);
      }
    },
    []
  );

  const createServer = useCallback(
    async (
      client: StreamChat,
      videoClient: StreamVideoClient,
      name: string,
      imageUrl: string,
      userIds: string[]
    ) => {
      const serverId = uuid();
      const messagingChannel = client.channel("messaging", uuid(), {
        name: "Welcome",
        members: userIds,
        data: {
          image: imageUrl,
          serverId: serverId,
          server: name,
          category: "Text Channels",
        },
      });
      try {
        const response = await messagingChannel.create();
        console.log("[HoscordContext - createServer] Response: ", response);
        const server: HoscordServer = {
          id: serverId,
          name: name,
          image: imageUrl,
        };
        await createCall(videoClient, server, "General Voice Channel", userIds);
      } catch (err) {
        console.error(err);
      }
    },
    [createCall]
  );

  const createChannel = useCallback(
    async (
      client: StreamChat,
      name: string,
      category: string,
      userIds: string[]
    ) => {
      if (client.userID) {
        const channel = client.channel("messaging", {
          name: name,
          members: userIds,
          data: {
            image: myState.server?.image,
            serverId: myState.server?.id,
            server: myState.server?.name,
            category: category,
          },
        });
        try {
          const response = await channel.create();
        } catch (err) {
          console.log(err);
        }
      }
    },
    [myState.server]
  );

  const setCall = useCallback(
    (callId: string | undefined) => {
      setMyState((myState) => {
        return { ...myState, callId };
      });
    },
    [setMyState]
  );

  // You can adjust 'store' based on your actual state management.
  const store: HoscordState = {
    server: myState.server,
    callId: myState.callId,
    channelsByCategories: myState.channelsByCategories,
    changeServer: changeServer,
    createServer: createServer,
    createChannel: createChannel,
    createCall: createCall,
    setCall: setCall,
  };

  return (
    <HoscordContext.Provider value={store}>{children}</HoscordContext.Provider>
  );
};

export const useHoscordContext = () => useContext(HoscordContext);
