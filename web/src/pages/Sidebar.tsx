import { ChevronFirst, ChevronLast, MoreVertical } from "lucide-react";
import { useState, type ReactNode } from "react";

export const Sidebar = ({ children }: { children: ReactNode }) => {
  const [expanded, setExpanded] = useState(true);
  return (
    <aside
      className={`h-screen transition-all duration-300 ${
        expanded ? "w-64" : "w-16"
      }`}
    >
      <nav className="h-full flex flex-col bg-white border-r shadow-sm">
        <div className="p-4 pb-2 flex justify-between items-center">
          <h3
            className={`font-semibold overflow-hidden transition-all ${expanded ? "w-32" : "w-0"}`}
          >
            Chatbot
          </h3>
          <div className="flex gap-1">
            <button
              className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronFirst /> : <ChevronLast />}
            </button>
            <button className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100">
              <MoreVertical />
            </button>
          </div>
        </div>
        <ul className={`flex-1 px-3 overflow-hidden transition-all ${expanded ? "w-32" : "w-0"}`}>{children}</ul>
      </nav>
    </aside>
  );
};

export const SidebarItem = ({
  text,
  active,
  onClick,
}: {
  text: string;
  active: boolean;
  onClick?: () => void;
}) => {
  return (
    <li onClick={onClick}>
      <span>{text}</span>
    </li>
  );
};
