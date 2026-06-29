import React from "react";
import { useParams } from "react-router-dom";
import {
  LayoutDashboard,
  Megaphone,
  PhoneCall,
  ClipboardList,
  ScrollText,
  CalendarClock,
} from "lucide-react";
import CrmDashboard from "../components/crm/CrmDashboard";
import Campaigns from "../components/crm/Campaigns";
import DialQueue from "../components/crm/DialQueue";
import Plan from "../components/crm/Plan";
import CrmLogs from "../components/crm/CrmLogs";
import Schedule from "../components/crm/Schedule";

const SECTIONS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard size={18} />,
    component: CrmDashboard,
    description: "CRM overview & key metrics",
  },
  {
    id: "campaigns",
    label: "Campaigns",
    icon: <Megaphone size={18} />,
    component: Campaigns,
    description: "Manage and track campaigns",
  },
  {
    id: "dial",
    label: "Dial Queue",
    icon: <PhoneCall size={18} />,
    component: DialQueue,
    description: "Outbound calling queue",
  },
  {
    id: "schedule",
    label: "Schedule",
    icon: <CalendarClock size={18} />,
    component: Schedule,
    description: "Upcoming follow-ups & meetings",
  },
  {
    id: "plan",
    label: "Plan",
    icon: <ClipboardList size={18} />,
    component: Plan,
    description: "Planning & strategy",
  },
  {
    id: "logs",
    label: "Logs",
    icon: <ScrollText size={18} />,
    component: CrmLogs,
    description: "Campaign & lead activity logs",
  },
];

const CrmPage = (): React.JSX.Element => {
  const { section } = useParams<{ section: string }>();
  const activeSection = section || "dashboard";
  const activeSectionData = SECTIONS.find((s) => s.id === activeSection);
  const ActiveComponent = activeSectionData?.component || CrmDashboard;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-20">
      {/* <div className="bg-surface border-b border-border top-0 z-30 card rounded-2xl px-4 sm:px-8 lg:px-16 py-6 sm:py-10">
        <div
          className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8"
          style={{ padding: "20px" }}
        >
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-text tracking-tight flex items-center gap-4">
              <div className="">
                {activeSectionData?.icon
                  ? React.cloneElement(
                      activeSectionData.icon as React.ReactElement
                    )
                  : null}
              </div>
              CRM — {activeSectionData?.label || "Dashboard"}
            </h1>
            <p className="text-base text-text-secondary mt-2 font-medium">
              {activeSectionData?.description || "Customer relationship management"}
            </p>
          </div>
        </div>
      </div> */}

      {/* <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 mt-6 sm:mt-8"> */}
        <div className="animate-fade-in" key={activeSection}>
          <ActiveComponent />
        </div>
      {/* </div> */}
    </div>
  );
};

export default CrmPage;
