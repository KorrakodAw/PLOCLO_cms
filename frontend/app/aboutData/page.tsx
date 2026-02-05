"use client";

import { useTranslation } from "react-i18next";
import Image from "next/image";
import { motion } from "framer-motion";
import { FaRocket, FaCheckCircle, FaLightbulb } from "react-icons/fa";

type CardData = {
  id: number;
  name_th: string;
  name_eng: string;
  role: string;
  image: string;
};

export default function AboutData() {
  const { t } = useTranslation("common");

  const cards: CardData[] = [
    {
      id: 1,
      name_th: "บุณสิตา ปวงอาจ",
      name_eng: "(BOONSITA PUANGART)",
      role: "Designer",
      image: "/images/profile/boonsita.jpg",
    },
    {
      id: 2,
      name_th: "ศิรชัช อรุณแจ้ง",
      name_eng: "(SIRACHAT ARUNJANG)",
      role: "Frontend Developer",
      image: "/images/profile/sirachat.jpg",
    },
    {
      id: 3,
      name_th: "ศุภณัฐ แสงตุ๊",
      name_eng: "(SUPANAS SANGTU)",
      role: "Backend Developer",
      image: "/images/profile/supanas.jpg",
    },
    {
      id: 4,
      name_th: "เทพทัต แผนสันเที๊ยะ",
      name_eng: "(THEPTHAT PHAENSANTHIA)",
      role: "DevOps",
      image: "/images/profile/thepthat.png",
    },
    {
      id: 5,
      name_th: "เบญญาภา แก้วพาปราบ",
      name_eng: "(BENYAPA KAEOPHAPRAP)",
      role: "UI/UX Designer",
      image: "/images/profile/benyapa.jpg",
    },
    {
      id: 6,
      name_th: "ดร.สุรเดช จิตประไพกุลศาล",
      name_eng: "(DR. SURADET JITPRAPAIKULSARN)",
      role: "ADVISOR",
      image: "/images/profile/suradet.png",
    },
    {
      id: 7,
      name_th: "ผศ.ดร.สสิกรณณ์ เหลืองวิชชเจริญ",
      name_eng: "(ASST. PROF. DR. SASIKORN LEUNGVICHCHAROEN)",
      role: "ADVISOR",
      image: "/images/profile/sasikorn.png",
    },
    {
      id: 8,
      name_th: "กรกฎ อนุวรรณ์",
      name_eng: "(KORAKOD ANUWAN)",
      role: "Fullstack Developer",
      image: "/images/placeholder.png",
    },
    {
      id: 9,
      name_th: "ภัทร ทานิล",
      name_eng: "(PATTAR THANIL)",
      role: "Data Analyst",
      image: "/images/placeholder.png",
    },
    {
      id: 10,
      name_th: "ธนวัฒน์ สุภสมบัติโอฬาร",
      name_eng: "(THANAWAT SUPASOMBATIO-LARN)",
      role: "Research",
      image: "/images/kittaya.png",
    },
  ];

  // Organize by Version
  const versions = [
    {
      title: "Version 1.0",
      subtitle: "Conceptual Design & Launch",
      icon: <FaLightbulb />,
      team: cards.slice(0, 2),
    },
    {
      title: "Version 2.0",
      subtitle: "Core System Engineering",
      icon: <FaRocket />,
      team: cards.slice(2, 5),
    },
    {
      title: "Version 3.0",
      subtitle: "Analysis & Advanced Research",
      icon: <FaCheckCircle />,
      team: cards.slice(7, 10),
    },
  ];

  const advisors = cards.filter((c) => c.role === "ADVISOR");

  return (
    <div className="min-h-screen bg-white">
      {/* 1. HERO TITLE */}
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-l-8 border-blue-600 pl-8"
        >
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter">
            THE <span className="text-blue-600">TEAM</span>
          </h1>
          <p className="text-xl text-slate-500 mt-4 font-medium uppercase tracking-widest">
            Evolution through collaboration
          </p>
        </motion.div>
      </div>

      {/* 2. VERSION SECTIONS */}
      <div className="max-w-7xl mx-auto px-6 space-y-32 pb-32">
        {versions.map((v, idx) => (
          <section key={idx}>
            <div className="flex items-center gap-4 mb-12">
              <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-lg">
                {v.icon}
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 leading-none">
                  {v.title}
                </h2>
                <p className="text-slate-400 font-bold uppercase text-xs mt-1 tracking-widest">
                  {v.subtitle}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {v.team.map((person) => (
                <MemberCard key={person.id} data={person} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* 3. FIXED BOTTOM ADVISOR SECTION */}
      <section className="bg-slate-50 border-t border-slate-200 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-2">
              Mentorship Board
            </h2>
            <div className="h-1.5 w-24 bg-blue-600 mx-auto rounded-full" />
          </div>

          <div className="flex flex-wrap justify-center gap-10">
            {advisors.map((advisor) => (
              <AdvisorCard key={advisor.id} data={advisor} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// 👤 Development Member Card
function MemberCard({ data }: { data: CardData }) {
  return (
    <motion.div
      whileHover={{ y: -10 }}
      className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center transition-all group"
    >
      <div className="relative w-[150px] h-[200px] aspect-square mb-6 rounded-2xl overflow-hidden bg-slate-100 shadow-inner">
        <Image
          src={data.image || "/images/default-avatar.png"}
          alt={data.name_th}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-500"
        />
      </div>
      <h3 className="text-lg font-light text-slate-800 mb-1">{data.name_th}</h3>
      <p className="text-[15px] font-light text-slate-400 uppercase mb-4 tracking-tighter">
        {data.name_eng.replace(/[()]/g, "")}
      </p>
      <div className="mt-auto px-4 py-1.5 bg-blue-50 text-blue-600 text-[12px] font-light rounded-full uppercase">
        {data.role}
      </div>
    </motion.div>
  );
}

// 🎓 Advisor Card (The "Authority" Card)
function AdvisorCard({ data }: { data: CardData }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-2xl flex flex-col md:flex-row items-center gap-8 max-w-2xl w-full"
    >
      <div className="relative w-[160px] h-[220px] shrink-0">
        <div className="absolute inset-0 bg-blue-600 rounded-3xl translate-x-3 translate-y-3 opacity-10" />
        <div className="relative w-full h-full rounded-2xl overflow-hidden border-4 border-white shadow-xl">
          <Image
            src={data.image || "/images/default-avatar.png"}
            alt={data.name_th}
            fill
            className="object-cover"
          />
        </div>
      </div>
      <div className="flex flex-col text-center md:text-left">
        <span className="text-blue-600 font-black text-[11px] uppercase tracking-widest mb-2">
          Project Advisor
        </span>
        <h3 className="text-3xl font-black text-slate-900 mb-2 leading-tight">
          {data.name_th}
        </h3>
        <p className="text-sm font-bold text-slate-400 uppercase italic">
          {data.name_eng.replace(/[()]/g, "")}
        </p>
      </div>
    </motion.div>
  );
}
