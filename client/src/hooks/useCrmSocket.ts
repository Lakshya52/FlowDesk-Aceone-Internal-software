import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "./useSocket";
import { useAuthStore } from "../store/authStore";

export const useCrmSocket = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const socket = getSocket();
    const tenantId = typeof user?.tenantId === 'object' ? user.tenantId._id : user?.tenantId;

    const joinTenant = () => {
      if (tenantId) {
        socket.emit("join_tenant", tenantId);
      }
    };

    if (socket.connected) {
      joinTenant();
    }

    socket.on("connect", joinTenant);

    const invalidateLeads = () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    };

    const invalidateCampaigns = () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    };

    socket.on("crm:lead:created", invalidateLeads);
    socket.on("crm:lead:updated", invalidateLeads);
    socket.on("crm:lead:deleted", invalidateLeads);
    socket.on("crm:campaign:created", invalidateCampaigns);
    socket.on("crm:campaign:updated", invalidateCampaigns);
    socket.on("crm:campaign:deleted", invalidateCampaigns);

    return () => {
      socket.off("crm:lead:created", invalidateLeads);
      socket.off("crm:lead:updated", invalidateLeads);
      socket.off("crm:lead:deleted", invalidateLeads);
      socket.off("crm:campaign:created", invalidateCampaigns);
      socket.off("crm:campaign:updated", invalidateCampaigns);
      socket.off("crm:campaign:deleted", invalidateCampaigns);
      socket.off("connect", joinTenant);
    };
  }, [queryClient, user?.tenantId]);
};
