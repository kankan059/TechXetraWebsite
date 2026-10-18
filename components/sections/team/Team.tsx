"use client";

import TeamCard from "@/components/sections/team/TeamCard";
import { teamGroups } from "@/data/team";

const Team = () => {
  return (
    <main className="relative min-h-screen w-full overflow-hidden px-5 pb-24 pt-28 text-white sm:px-8 lg:px-12 lg:pt-32 xl:px-20">
      <div className="mx-auto w-full max-w-[1440px]">
        <header className="mb-16">
          <p className="mb-3 font-pixel text-sm uppercase tracking-widest text-[#168BFF]">
            The People Behind TechXetra
          </p>

          <h1 className="font-pixel text-4xl uppercase leading-tight sm:text-6xl lg:text-7xl">
            Meet the <span className="text-[#168BFF]">Team</span>
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-7 text-white/60 sm:text-base">
            The people, ideas, and teamwork bringing TechXetra to life.
          </p>
        </header>

        <div className="space-y-20">
          {teamGroups.map((group, groupIndex) => (
            <section key={group.title}>
              <div className="mb-8 flex items-end justify-between gap-4 border-b border-white/15 pb-4">
                <div>
                 
                  <h2 className="font-pixel text-xl uppercase sm:text-2xl lg:text-3xl">
                    {group.title}
                  </h2>

                  {group.description && (
                    <p className="mt-3 text-sm text-white/50">
                      {group.description}
                    </p>
                  )}
                </div>

              </div>

              <div className="flex flex-wrap justify-center gap-8">
                {group.members.map((member) => (
                  <div
                    key={`${group.title}-${member.name}`}
                    className="w-full max-w-[320px]"
                  >
                    <TeamCard
                      name={member.name}
                      title={member.role}
                      handle={member.name
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "")}
                      status={group.showContact ? "Core Team" : "Team Member"}
                      contactText="Email"
                      avatarUrl={member.image}
                      iconUrl="/favicon.svg"
                      holo={0}
                      glare={0.3}
                      tiltStrength={16}
                      parallax={0}
                      radius={14}
                      enableTilt
                      intro
                      showUserInfo
                      enableMobileTilt={false}
                      theme="dark"
                      onContactClick={() => {
                        if (group.showContact && member.email) {
                          window.location.href = `mailto:${member.email}`;
                        } else if (group.showContact && member.phone) {
                          window.location.href = `tel:${member.phone}`;
                        }
                      }}
                    />

                    {group.showContact && (
                      <div className="mt-4 space-y-2 text-center text-sm text-white/60">
                        {member.phone && (
                          <p>
                            <a
                              href={`tel:${member.phone}`}
                              className="transition-colors hover:text-[#168BFF]"
                            >
                              {member.phone}
                            </a>
                          </p>
                        )}

                        {member.email && (
                          <p className="break-all">
                            <a
                              href={`mailto:${member.email}`}
                              className="transition-colors hover:text-[#168BFF]"
                            >
                              {member.email}
                            </a>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
};

export default Team;