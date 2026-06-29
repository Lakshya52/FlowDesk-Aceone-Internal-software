import { useState, useEffect } from "react";
import { Calendar, Clock, Phone, Building, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import api from "../../lib/api";

interface Campaign {
	_id: string;
	name: string;
}

interface Lead {
	_id: string;
	name: string;
	phone?: string;
	companyName?: string;
	status: string;
	priority: string;
	nextFollowupAt?: string;
	campaignId?: Campaign | string;
}

const STATUS_BADGE: Record<string, string> = {
	callback_scheduled: "warning",
	meeting_scheduled: "info",
	new: "todo",
	attempted: "warning",
	connected: "info",
	interested: "success",
	not_interested: "danger",
	not_reachable: "danger",
	do_not_call: "danger",
	closed_won: "success",
	closed_lost: "danger",
};

const Schedule = () => {
	const [leads, setLeads] = useState<Lead[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		const fetch = async () => {
			try {
				const { data } = await api.get("/leads/upcoming");
				if (data.success) setLeads(data.leads);
			} catch (err: any) {
				setError(err.response?.data?.message || "Failed to load schedule");
			} finally {
				setLoading(false);
			}
		};
		fetch();
	}, []);

	const getCampaignName = (campaignId: any): string => {
		if (!campaignId) return "—";
		if (typeof campaignId === "object" && campaignId.name) return campaignId.name;
		return "—";
	};

	const formatDate = (d?: string) => {
		if (!d) return "—";
		return new Date(d).toLocaleDateString("en-IN", {
			day: "numeric",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const isOverdue = (d?: string) => {
		if (!d) return false;
		return new Date(d) < new Date();
	};

	if (loading) {
		return (
			<div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
				<Loader2 size={32} className="animate-spin" style={{ color: "var(--color-primary)" }} />
			</div>
		);
	}

	if (error) {
		return (
			<div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
				<div className="card" style={{ padding: 32, textAlign: "center" }}>
					<AlertCircle size={32} style={{ color: "var(--color-danger)", marginBottom: 12 }} />
					<p style={{ color: "var(--color-text-secondary)" }}>{error}</p>
				</div>
			</div>
		);
	}

	const upcomingLeads = leads.filter((l) => !isOverdue(l.nextFollowupAt));
	const overdueLeads = leads.filter((l) => isOverdue(l.nextFollowupAt));

	return (
		<div style={{ maxWidth: 900 }}>
			<div style={{ marginBottom: 24 }}>
				<h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
					Schedule
				</h1>
				<p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginTop: 4 }}>
					Upcoming follow-ups & meetings
				</p>
			</div>

			{leads.length === 0 ? (
				<div className="card" style={{ padding: 48, textAlign: "center" }}>
					<Calendar size={48} style={{ color: "var(--color-text-tertiary)", margin: "0 auto 16px", opacity: 0.3 }} />
					<h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-text)", margin: "0 0 6px" }}>
						No upcoming follow-ups
					</h3>
					<p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", margin: 0 }}>
						Schedule a follow-up from the lead details panel to see it here.
					</p>
				</div>
			) : (
				<>
					{overdueLeads.length > 0 && (
						<>
							<h2 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-danger)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
								<AlertCircle size={14} /> Overdue ({overdueLeads.length})
							</h2>
							<div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
								{overdueLeads.map((lead) => (
									<div key={lead._id} className="card" style={{ padding: "14px 18px", borderLeft: "3px solid var(--color-danger)" }}>
										<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
											<div>
												<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
													<span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{lead.name}</span>
													<span className={`badge badge-${STATUS_BADGE[lead.status] || "todo"}`} style={{ fontSize: "0.6rem", padding: "1px 6px", borderRadius: 6 }}>
														{lead.status.replace(/_/g, " ")}
													</span>
												</div>
												{lead.companyName && (
													<div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: "var(--color-text-secondary)", marginBottom: 2 }}>
														<Building size={12} /> {lead.companyName}
													</div>
												)}
												{lead.phone && (
													<div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
														<Phone size={12} /> {lead.phone}
													</div>
												)}
											</div>
											<div style={{ textAlign: "right", fontSize: "0.75rem", color: "var(--color-danger)", fontWeight: 500 }}>
												<div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
													<Clock size={12} /> {formatDate(lead.nextFollowupAt)}
												</div>
												<div style={{ fontSize: "0.7rem", color: "var(--color-text-tertiary)", marginTop: 2 }}>
													{getCampaignName(lead.campaignId)}
												</div>
											</div>
										</div>
									</div>
								))}
							</div>
						</>
					)}

					{upcomingLeads.length > 0 && (
						<>
							<h2 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-text)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
								<CheckCircle2 size={14} style={{ color: "var(--color-success)" }} /> Upcoming ({upcomingLeads.length})
							</h2>
							<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
								{upcomingLeads.map((lead) => (
									<div key={lead._id} className="card" style={{ padding: "14px 18px", borderLeft: "3px solid var(--color-primary)" }}>
										<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
											<div>
												<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
													<span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{lead.name}</span>
													<span className={`badge badge-${STATUS_BADGE[lead.status] || "todo"}`} style={{ fontSize: "0.6rem", padding: "1px 6px", borderRadius: 6 }}>
														{lead.status.replace(/_/g, " ")}
													</span>
												</div>
												{lead.companyName && (
													<div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: "var(--color-text-secondary)", marginBottom: 2 }}>
														<Building size={12} /> {lead.companyName}
													</div>
												)}
												{lead.phone && (
													<div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
														<Phone size={12} /> {lead.phone}
													</div>
												)}
											</div>
											<div style={{ textAlign: "right", fontSize: "0.75rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>
												<div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
													<Clock size={12} /> {formatDate(lead.nextFollowupAt)}
												</div>
												<div style={{ fontSize: "0.7rem", color: "var(--color-text-tertiary)", marginTop: 2 }}>
													{getCampaignName(lead.campaignId)}
												</div>
											</div>
										</div>
									</div>
								))}
							</div>
						</>
					)}
				</>
			)}
		</div>
	);
};

export default Schedule;