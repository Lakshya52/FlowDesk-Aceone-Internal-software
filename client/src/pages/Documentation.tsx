import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
	Search,
	Sun,
	Menu,
	X,
	ChevronRight,
	ArrowRight,
	ArrowLeft,
	Clipboard,
	Check,
	BookOpen,
} from "lucide-react";
import type { Section } from "../docs/content";
import pages, { linkSlugs } from "../docs/content";

const navSections = [
	{
		title: "GETTING STARTED",
		links: ["Introduction", "Quickstart", "Installation", "Configuration"],
	},
	{
		title: "PROJECT MANAGEMENT",
		links: [
			"Ongoing Work",
			"Completed Projects",
			"Recurring Blueprints",
			"Assignments",
		],
	},
	{
		title: "TASK ECOSYSTEM",
		links: ["Task States", "Checkpoints", "Team Ownership", "Deadlines"],
	},
	{
		title: "COLLABORATION",
		links: [
			"AI Buddy",
			"Collaborative Canvas",
			"Real-time Chat",
			"Activity Logs",
		],
	},
	{
		title: "SECURITY & ROLES",
		links: ["RBAC Overview", "Admin Role", "Manager Role", "Member Role"],
	},
	{
		title: "ADVANCED",
		links: [
			"Recurring Engine",
			"No-Due-Date Logic",
			"Glassmorphism UI",
			"Real-time Status",
		],
	},
];

const GitHubIcon = () => (
	<svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
		<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
	</svg>
);

function ActiveNavLink({
	href,
	children,
	active,
	onClick,
}: {
	href: string;
	children: React.ReactNode;
	active?: boolean;
	onClick?: () => void;
}) {
	return (
		<Link
			to={href}
			onClick={onClick}
			className={`text-sm py-1 pl-2 rounded cursor-pointer block ${
				active
					? "bg-gray-100 text-black font-medium border-l-2 border-black pl-[6px]"
					: "text-gray-600 hover:text-black hover:bg-gray-100"
			}`}
		>
			{children}
		</Link>
	);
}

function Sidebar({
	open,
	onClose,
	currentSlug,
	searchQuery,
	onSearchChange,
	inputRef,
}: {
	open: boolean;
	onClose: () => void;
	currentSlug: string;
	searchQuery: string;
	onSearchChange: (v: string) => void;
	inputRef: React.RefObject<HTMLInputElement | null>;
}) {
	const q = searchQuery.toLowerCase();

	const filteredSections = q
		? navSections
				.map((s) => ({
					...s,
					links: s.links.filter((l) => l.toLowerCase().includes(q)),
				}))
				.filter((s) => s.links.length > 0)
		: navSections;

	return (
		<>
			{open && (
				<div
					className="fixed inset-0 bg-black/20 z-40 lg:hidden"
					onClick={onClose}
				/>
			)}
			<aside
				className={`${
					open ? "translate-x-0" : "-translate-x-full"
				} lg:translate-x-0 fixed lg:sticky top-0 left-0 z-50 lg:z-auto h-[calc(100dvh-56px)] w-[260px] backdrop-blur-xl bg-[#f8f8f8]  border-r border-gray-100 flex flex-col transition-transform duration-300 ease-in-out`}
			>
				<button
					onClick={onClose}
					className="lg:hidden text-gray-400 hover:text-black -ml-1"
				>
					<X size={18} className="m-5" />
				</button>

				<div className="px-4 pt-4 pb-2 shrink-0">
					<div className="relative">
						<Search
							size={14}
							className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
						/>
						<input
							ref={inputRef}
							type="text"
							placeholder="Search docs..."
							value={searchQuery}
							onChange={(e) => onSearchChange(e.target.value)}
							className="w-full pl-9 pr-10 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors"
						/>
						<kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-0.5 font-mono">
							⌘K
						</kbd>
					</div>
				</div>

				<nav className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-gray-50">
					{filteredSections.length === 0 ? (
						<p className="text-sm text-gray-400 mt-4 text-center">
							No results found
						</p>
					) : (
						filteredSections.map((section) => (
							<div key={section.title}>
								<h4 className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 mt-5 mb-1">
									{section.title}
								</h4>
								<div className="flex flex-col gap-px">
									{section.links.map((link) => {
										const slug = linkSlugs[link];
										return (
											<ActiveNavLink
												key={link}
												href={`/documentation/${slug}`}
												active={slug === currentSlug}
												onClick={() =>
													onSearchChange("")
												}
											>
												{link}
											</ActiveNavLink>
										);
									})}
								</div>
							</div>
						))
					)}
				</nav>

				{/* <div className="h-12 px-4 border-t border-gray-100 flex items-center justify-between text-gray-400 shrink-0">
          <button className="hover:text-gray-600 transition-colors">
            <Sun size={15} />
          </button>
          <span className="text-[11px] font-mono border border-gray-200 rounded px-1.5 py-0.5">v2.1.4</span>
          <Link to="#" className="hover:text-gray-600 transition-colors">
            <GitHubIcon />
          </Link>
        </div> */}
			</aside>
		</>
	);
}

function CodeBlock({ children }: { children: React.ReactNode }) {
	const [copied, setCopied] = useState(false);
	return (
		<div className="relative group bg-[#0f0f0f] rounded-xl p-4 my-4">
			<button
				onClick={() => {
					navigator.clipboard.writeText(
						String(children).replace(/\$ /g, ""),
					);
					setCopied(true);
					setTimeout(() => setCopied(false), 2000);
				}}
				className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors"
			>
				{copied ? (
					<Check size={14} className="text-green-400" />
				) : (
					<Clipboard size={14} />
				)}
			</button>
			<pre className="text-sm font-mono text-green-400 overflow-x-auto whitespace-pre-wrap">
				{children}
			</pre>
		</div>
	);
}

function Callout({ children }: { children: React.ReactNode }) {
	return (
		<div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded text-sm text-blue-800 my-6">
			{children}
		</div>
	);
}

function renderSections(sections: Section[]) {
	return sections.map((s, i) => {
		switch (s.type) {
			case "h2":
				return (
					<h2
						key={i}
						id={s.id}
						data-heading={s.content}
						className="text-xl font-semibold text-gray-900 mt-10 mb-3 pb-2 border-b border-gray-100"
					>
						{s.content}
					</h2>
				);
			case "h3":
				return (
					<h3
						key={i}
						className="text-base font-semibold text-gray-900 mt-6 mb-2"
					>
						{s.content}
					</h3>
				);
			case "p": {
				const text = s.content as string;
				const withLinks = text
					.replace(/<a>(.*?)<\/a>/g, (_, label) => {
						const slug = linkSlugs[label];
						return `<Link href="/documentation/${slug}" class="text-blue-600 hover:underline">${label}</a>`;
					})
					.replace(
						/<code>(.*?)<\/code>/g,
						'<code class="text-sm bg-gray-100 px-1.5 py-0.5 rounded font-mono">$1</code>',
					)
					.replace(
						/<strong>(.*?)<\/strong>/g,
						'<strong class="text-gray-900">$1</strong>',
					);
				return (
					<p
						key={i}
						className="text-gray-600 text-[15px] leading-7 mb-4"
						dangerouslySetInnerHTML={{ __html: withLinks }}
					/>
				);
			}
			case "list": {
				const items = s.content as [string, string][];
				return (
					<ul key={i} className="space-y-3 mb-4">
						{items.map(([title, desc]) => (
							<li
								key={title}
								className="flex items-start gap-3 text-[15px] text-gray-600 leading-7"
							>
								<Check
									size={16}
									className="text-green-500 mt-[5px] shrink-0"
								/>
								<span>
									<strong className="text-gray-900">
										{title}:
									</strong>{" "}
									{desc}
								</span>
							</li>
						))}
					</ul>
				);
			}
			case "ordered": {
				const items = s.content as string[];
				return (
					<ol
						key={i}
						className="list-decimal list-inside space-y-2 text-gray-600 text-[15px] leading-7 mb-4"
					>
						{items.map((item) => (
							<li
								key={item}
								dangerouslySetInnerHTML={{
									__html: item.replace(
										/<code>(.*?)<\/code>/g,
										'<code class="text-sm bg-gray-100 px-1.5 py-0.5 rounded font-mono">$1</code>',
									),
								}}
							/>
						))}
					</ol>
				);
			}
			case "code":
				return <CodeBlock key={i}>{s.content as string}</CodeBlock>;
			case "callout":
				return <Callout key={i}>{s.content as string}</Callout>;
			case "table": {
				const { headers, rows } = s.content as {
					headers: string[];
					rows: [string, string, string][];
				};
				return (
					<div key={i} className="overflow-x-auto my-6">
						<table className="w-full text-sm border-collapse">
							<thead>
								<tr className="border-b border-gray-200">
									{headers.map((h) => (
										<th
											key={h}
											className="text-left py-3 pr-4 font-semibold text-gray-900"
										>
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{rows.map((row, ri) => (
									<tr
										key={ri}
										className="border-b border-gray-100"
									>
										{row.map((cell, ci) => (
											<td
												key={ci}
												className={`py-3 ${ci === 0 ? "pr-4 font-medium text-gray-900" : ci === 1 ? "px-4 text-gray-600" : "pl-4 text-gray-600"}`}
											>
												{cell}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				);
			}
			case "arch-cards": {
				const items = s.content as [string, string][];
				return (
					<div key={i} className="grid gap-4 my-6">
						{items.map(([title, desc]) => (
							<div
								key={title}
								className="border border-gray-200 rounded-lg p-4"
							>
								<h4 className="text-sm font-semibold text-gray-900 mb-1">
									{title}
								</h4>
								<p className="text-sm text-gray-600 leading-6">
									{desc}
								</p>
							</div>
						))}
					</div>
				);
			}
			default:
				return null;
		}
	});
}

function getTocHeadings(sections: Section[]): string[] {
	return sections
		.filter((s) => s.type === "h2")
		.map((s) => s.content as string);
}

export default function Documentation() {
	const { slug = "introduction" } = useParams<{ slug: string }>();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [activeHeading, setActiveHeading] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const contentRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement | null>(null);

	const page = pages[slug];

	useEffect(() => {
		if (!page) return;
		const firstH2 = page.sections.find((s) => s.type === "h2");
		if (firstH2) setActiveHeading(firstH2.content as string);
	}, [slug, page]);

	useEffect(() => {
		if (contentRef.current) {
			contentRef.current.scrollTop = 0;
		}
	}, [slug]);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "k") {
				e.preventDefault();
				searchInputRef.current?.focus();
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, []);

	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						setActiveHeading(
							entry.target.getAttribute("data-heading") || "",
						);
					}
				}
			},
			{ rootMargin: "-80px 0px -60% 0px" },
		);
		const elements = document.querySelectorAll("[data-heading]");
		elements.forEach((el) => observer.observe(el));
		return () => observer.disconnect();
	}, [slug]);

	const tocHeadings = page ? getTocHeadings(page.sections) : [];

	if (!page) {
		return (
			<div className="min-h-screen font-sans flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-gray-900 mb-2">
						Page not found
					</h1>
					<p className="text-gray-500 mb-4">
						The documentation page "{slug}" does not exist.
					</p>
					<Link
						to="/documentation/introduction"
						className="text-blue-600 hover:underline"
					>
						Back to Introduction
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen font-sans flex flex-col w-[90dvw] sm:w-[80vw] md:w-[75vw] mx-auto">
			<header className="h-14 border-b border-gray-200 flex items-center px-4 lg:px-6 shrink-0 sticky top-0 z-30">
				<button
					onClick={() => setSidebarOpen(true)}
					className="lg:hidden text-gray-500 hover:text-black mr-3"
				>
					<Menu size={18} />
				</button>
				<div className="flex items-center gap-2 mr-6">
					{/* <BookOpen size={18} className="text-black" /> */}

					<div
						style={{
							width: 28,
							height: 28,
							borderRadius: 8,
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
						}}
						className="overflow-hidden"
					>
						<img
							src="/icon.ico"
							alt="FlowDesk logo"
							className="rounded-xl scale-125"
						/>
					</div>

					<Link to="/" className="font-semibold text-sm">
						FlowDesk
					</Link>
					<span className="text-gray-300 text-sm mx-1">/</span>
					<span className="text-sm text-gray-500">Docs</span>
				</div>
				<div className="ml-auto flex items-center gap-4 text-sm">
					{/* <Link to="#" className="text-gray-500 hover:text-black transition-colors">Changelog</Link> */}
					<Link
						to="https://github.com/Lakshya52/flowdesk-aceone-internal-software/"
						target="_blank"
						className="text-gray-500 hover:text-black transition-colors hidden sm:inline"
					>
						<GitHubIcon />
					</Link>
					{/* <Link to="#" className="text-gray-500 hover:text-black transition-colors hidden sm:inline">Discord</Link> */}
					<Link
						to="/login"
						className="bg-black text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors inline-block"
					>
						Get&nbsp;Started
					</Link>
				</div>
			</header>

			<div className="flex flex-1 overflow-hidden">
				<Sidebar
					open={sidebarOpen}
					onClose={() => setSidebarOpen(false)}
					currentSlug={slug}
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
					inputRef={searchInputRef}
				/>

				<main
					ref={contentRef}
					className="flex-1 overflow-y-auto h-[calc(100vh-3.5rem)] scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-gray-50"
				>
					<div className="max-w-2xl mx-auto px-6 lg:px-8 py-10">
						<nav className="flex items-center gap-1 text-xs text-gray-400 mb-6">
							{page.breadcrumbs.map((crumb, i) => (
								<span
									key={i}
									className="flex items-center gap-1"
								>
									{i > 0 && <ChevronRight size={12} />}
									{crumb.slug ? (
										<Link
											to={`/documentation/${crumb.slug}`}
											className="hover:text-gray-600"
										>
											{crumb.label}
										</Link>
									) : (
										<span
											className={
												i ===
												page.breadcrumbs.length - 1
													? "text-gray-600"
													: ""
											}
										>
											{crumb.label}
										</span>
									)}
								</span>
							))}
						</nav>

						<h1 className="text-3xl font-bold text-gray-900 mb-2">
							{page.title}
						</h1>
						<p className="text-gray-500 text-sm mb-2">
							{page.description}
						</p>
						<div className="flex items-center gap-2 text-xs text-gray-400 mb-8">
							<span>Last updated: {page.lastUpdated}</span>
							<span>·</span>
							<span>{page.readingTime}</span>
						</div>

						{renderSections(page.sections)}

						<div className="flex justify-between border-t border-gray-100 pt-6 mt-12">
							{page.prev ? (
								<Link
									to={`/documentation/${page.prev.slug}`}
									className="flex items-center gap-1 text-sm text-gray-500 hover:text-black transition-colors"
								>
									<ArrowLeft size={14} />
									Previous: {page.prev.title}
								</Link>
							) : (
								<div />
							)}
							{page.next ? (
								<Link
									to={`/documentation/${page.next.slug}`}
									className="flex items-center gap-1 text-sm text-gray-500 hover:text-black transition-colors"
								>
									Next: {page.next.title}
									<ArrowRight size={14} />
								</Link>
							) : (
								<div />
							)}
						</div>
					</div>
				</main>

				<aside className="hidden xl:block w-[200px] shrink-0 border-l border-gray-100 h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto">
					<div className="px-4 py-8">
						<h4 className="text-[11px] uppercase tracking-wide text-gray-400 mb-3 font-semibold">
							On this page
						</h4>
						<nav className="flex flex-col gap-px">
							{tocHeadings.map((h) => (
								<a
									key={h}
									href={`#${h
										.toLowerCase()
										.replace(/\s+/g, "-")
										.replace(/&/g, "and")
										.replace(/[^a-z0-9-]/g, "")}`}
									onClick={(e) => {
										e.preventDefault();
										const el = document.getElementById(
											h
												.toLowerCase()
												.replace(/\s+/g, "-")
												.replace(/&/g, "and")
												.replace(/[^a-z0-9-]/g, ""),
										);
										if (el)
											el.scrollIntoView({
												behavior: "smooth",
											});
									}}
									className={`text-sm py-1 transition-colors ${
										activeHeading === h
											? "text-black font-medium"
											: "text-gray-500 hover:text-black"
									}`}
								>
									{h}
								</a>
							))}
						</nav>
					</div>
				</aside>
			</div>
		</div>
	);
}
