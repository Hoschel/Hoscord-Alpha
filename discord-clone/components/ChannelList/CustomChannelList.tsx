import { useHoscordContext } from "@/contexts/HoscordContext";
import ChannelListTopBar from "./TopBar/ChannelListTopBar";
import CategoryItem from "./CategoryItem";
import ChannelListBottomBar from "./BottomBar/ChannelListBottomBar";
import CreateChannelForm from "./CreateChannelForm/CreateChannelForm";
import CallList from "./CallList/CallList";

export default function CustomChannelList(): JSX.Element {
  const { server, channelsByCategories } = useHoscordContext();

  return (
    <div className="w-72 bg-medium-gray h-full flex flex-col items-start">
      <ChannelListTopBar serverName={server?.name || "Direct Messages"} />

      <div className="w-full">
        {Array.from(channelsByCategories.keys()).map((category, index) => (
          <CategoryItem
            key={`${category}-${index}`}
            category={category}
            serverName={server?.name || "Direct Messages"}
            channels={channelsByCategories.get(category) || []}
          />
        ))}
      </div>
      <CallList />
      <CreateChannelForm />
      <ChannelListBottomBar />
    </div>
  );
}
