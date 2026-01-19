// comp-343.tsx
"use client"

import {
  PlusIcon,
  DatabaseIcon,
  ActivityIcon,
  Code2Icon,
  BrainCircuitIcon,
  CrownIcon,
  UsersIcon,
} from "lucide-react"
import { Accordion as AccordionPrimitive } from "radix-ui"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from "@/components/ui/accordion"

const groups = [
  {
    id: "group-1",
    icon: DatabaseIcon,
    title: "Group 1 — Data Collection and Cloud Computing",
    sub: "Data ingestion and cloud infrastructure.",
    leaders: ["Suryaa", "Rithin", "Padmanaban"],
    instructors: ["Dr. Brian An", "Tiger Peng", "Sam Duong"],
    members: [
      { name: "Aechan, Rithinteja" },
      { name: "Ahuja, Parth" },
      { name: "Budida, Anish" },
      { name: "Chen, Kevin" },
      { name: "Dhanani, Misry Pravinchandra" },
      { name: "Gaddy, Channing Kirkwood" },
      { name: "Gardiner, Justin Paul" },
      { name: "Gautam, Om" },
      { name: "Gogi, Rohit Prakash" },
      { name: "Guhl, Lauren Alexandra" },
      { name: "Kang, Lucas" },
      { name: "Kanumuri, Sai Lalith" },
      { name: "Liang, Ellen" },
      { name: "Mittal, Meghna" },
      { name: "Mitte, Nishanth" },
      { name: "Narra, Rithik Chowdary" },
      { name: "Potula, Tanish" },
      { name: "Saravanan, Padmanaban" },
      { name: "Shah, Divy Jikin" },
    ],
  },
  {
    id: "group-2",
    icon: ActivityIcon,
    title: "Group 2 — Measurement & Verification (M&V)",
    sub: "Metrics, validation, and performance analysis.",
    leaders: ["Keyang", "Yiming", "Brandon M."],
    instructors: ["John Kim"],
    members: [
      { name: "Michaels, Brandon Jarett" },
      { name: "Zhong, Keyang" },
      { name: "Yiming Ye" },
      { name: "Gorty, Prasanna Srinivasan" },
      { name: "Kunder, Likhit Nagraj" },
      { name: "Kuraparthi, Sai Sravya" },
    ],
  },
  {
    id: "group-3",
    icon: Code2Icon,
    title: "Group 3 — Visualization & Web Development",
    sub: "Dashboards, UX, and front-end systems.",
    leaders: ["Brandon D.", "Rohan"],
    instructors: ["Dr. Constance Crozier"],
    members: [
      { name: "Davidson, Brandon Lee" },
      { name: "Gandham, Rohan Venkat Sai" },
      { name: "Jani, Hitanshu J" },
      { name: "Kanani, Rudra Chintan" },
      { name: "Khanuja, Nimrath" },
      { name: "Kim, Nathan Donghyun" },
      { name: "Nayar, Neel" },
    ],
  },
  {
    id: "group-4",
    icon: BrainCircuitIcon,
    title:
      "Group 4 — Data Analysis: Physical & Cyber Attacks / Storm Analysis",
    sub: "Resilience, security, and extreme event analysis.",
    leaders: ["Hanwen Kang"],
    instructors: ["Daein Kang"],
    members: [
      { name: "Chery, Lorika Christy" },
      { name: "Zhang, Jason" },
      { name: "Gunturu, Soham" },
    ],
  },
]

// Flattened instructor list for cards
const instructorCards = [
  {
    name: "Dr. Brian An",
    role: "Lab Leadership",
    groups: ["Group 1 — Data Collection and Cloud Computing"],
    isLeadership: true,
  },
  {
    name: "Dr. Constance Crozier",
    role: "Lab Leadership",
    groups: ["Group 3 — Visualization & Web Development"],
    isLeadership: true,
  },
  {
    name: "Tiger Peng",
    role: "Instructor",
    groups: ["Group 1 — Data Collection and Cloud Computing"],
    isLeadership: false,
  },
  {
    name: "Sam Duong",
    role: "Instructor",
    groups: ["Group 1 — Data Collection and Cloud Computing"],
    isLeadership: false,
  },
  {
    name: "John Kim",
    role: "Instructor",
    groups: ["Group 2 — Measurement & Verification (M&V)"],
    isLeadership: false,
  },
  {
    name: "Daein Kang",
    role: "Instructor",
    groups: [
      "Group 4 — Data Analysis: Physical & Cyber Attacks / Storm Analysis",
    ],
    isLeadership: false,
  },
]

export default function Component() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <UsersIcon className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-xl font-bold">Team</h2>
      </div>

      {/* Instructors / leadership cards */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Lab Leadership & Instructors
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {instructorCards.map((inst) => (
            <div
              key={inst.name}
              className={
                "flex flex-col justify-between rounded-lg border px-3 py-3 text-sm " +
                (inst.isLeadership
                  ? "border-primary/70 bg-primary/5 shadow-sm"
                  : "border-border bg-background")
              }
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span
                    className={
                      "font-semibold " +
                      (inst.isLeadership
                        ? "text-primary"
                        : "text-foreground")
                    }
                  >
                    {inst.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {inst.role}
                  </span>
                </div>
                {inst.isLeadership && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    <CrownIcon className="h-3 w-3" />
                    Leadership
                  </span>
                )}
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {inst.groups.map((g) => (
                  <div key={g}>• {g}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Accordion with groups */}
      <Accordion
        type="single"
        collapsible
        className="w-full"
        defaultValue="group-1"
      >
        {groups.map((group) => (
          <AccordionItem value={group.id} key={group.id} className="py-2">
            <AccordionPrimitive.Header className="flex">
              <AccordionPrimitive.Trigger className="flex flex-1 items-center justify-between rounded-md py-2 text-left text-[15px] leading-6 font-semibold transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg>path:last-child]:origin-center [&>svg>path:last-child]:transition-all [&>svg>path:last-child]:duration-200 [&[data-state=open]>svg]:rotate-180 [&[data-state=open]>svg>path:last-child]:rotate-90 [&[data-state=open]>svg>path:last-child]:opacity-0">
                <span className="flex items-center gap-3">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-muted/40"
                    aria-hidden="true"
                  >
                    <group.icon size={18} className="opacity-70" />
                  </span>
                  <span className="flex flex-col space-y-1">
                    <span>{group.title}</span>
                    {group.sub && (
                      <span className="text-sm font-normal text-muted-foreground">
                        {group.sub}
                      </span>
                    )}
                  </span>
                </span>
                <PlusIcon
                  size={16}
                  className="pointer-events-none shrink-0 opacity-60 transition-transform duration-200"
                  aria-hidden="true"
                />
              </AccordionPrimitive.Trigger>
            </AccordionPrimitive.Header>

            <AccordionContent className="ms-3 ps-10 pb-3">
              {/* Leadership / instructors block */}
              <div className="mb-4 space-y-1 text-sm">
                <div>
                  <span className="font-semibold">Group leaders: </span>
                  <span>{group.leaders.join(", ")}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="font-semibold">Assigned instructor(s):</span>
                  {group.instructors.map((instructor) => (
                    <span
                      key={instructor}
                      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      <CrownIcon className="h-3 w-3" />
                      {instructor}
                    </span>
                  ))}
                </div>
              </div>

              {/* Members grid (no "New" badge now) */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.members.map((member) => (
                  <div
                    key={member.name}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm bg-background"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {member.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Group member
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
