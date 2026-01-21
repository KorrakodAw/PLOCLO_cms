"use client";

import { useTranslation } from "react-i18next";
import Image from "next/image";
import { motion } from "framer-motion";

type CardData = {
  id: number;
  name_th: string;
  name_eng: string;
  role: string;
  image: string;
};

export default function AboutData() {
  const { t } = useTranslation("common");

  // Mock data preserved from your example
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
      image: "/images",
    },
    {
      id: 9,
      name_th: "ภัทร ทานิล",
      name_eng: "(PATTAR THANIL)",
      role: "Data Analyst",
      image: "/images",
    },
    {
      id: 10,
      name_th: "ธนวัฒน์ สุภสมบัติโอฬาร",
      name_eng: "(THANAWAT SUPASOMBATIO-LARN)",
      role: "Research",
      image: "/images/kittaya.png",
    },
  ];

  const version1 = cards.slice(0, 2);
  const version2 = cards.slice(2, 5);
  const version3 = cards.slice(7, 10);

  const advisors = cards.filter((c) => c.role === "ADVISOR");

  return (
    <div className="min-h-screen bg-slate-50 py-16">
      <div className="max-w-7xl h-full flex flex-col mx-auto px-4 sm:px-6">
        {/* 1. Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight">
            {t("about") || "Meet Our Team"}
          </h1>
          <p className="mt-4 text-slate-500 max-w-2xl mx-auto">
            The talented individuals behind the project.
          </p>
        </motion.div>

        {/* 2. 🔹 Team Section (Stacked Rows) */}
        <div className="flex flex-col gap-16 mb-20">
          {[version1, version2, version3].map((version, index) => (
            <div key={index} className="w-full">
              {/* Version Header with modern styling */}
              <motion.div
                className="flex items-center gap-4 mb-8"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <div className="h-10 w-1.5 bg-blue-600 rounded-full"></div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">
                    Version {index + 1}
                  </h3>
                  <span className="text-sm text-slate-400 font-medium tracking-wider uppercase">
                    Development Team
                  </span>
                </div>
              </motion.div>

              {/* Grid of People */}
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 place-items-center sm:place-items-start"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.1 } },
                }}
              >
                {version.map((person) => (
                  <motion.div
                    key={person.id}
                    className="w-full max-w-[280px]" // Consistent max width
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: { opacity: 1, y: 0 },
                    }}
                  >
                    <PersonCard data={person} />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="relative flex py-5 items-center mb-16">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink-0 mx-4 text-slate-400 text-sm uppercase tracking-widest font-semibold">
            Mentorship
          </span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* 3. 🔹 Advisors Section */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-800">
            Project Advisors
          </h2>
        </div>

        <motion.div
          className="flex flex-wrap justify-center gap-8 md:gap-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true, amount: 0.1 }}
        >
          {advisors.map((advisor) => (
            <AdvisorCard key={advisor.id} data={advisor} />
          ))}
        </motion.div>
      </div>
    </div>
  );
}

// 🧱 Member Card (Updated UI)
function PersonCard({ data }: { data: CardData }) {
  return (
    <motion.div
      whileHover={{ y: -8 }}
      className="group relative bg-white rounded-2xl overflow-hidden shadow-lg shadow-slate-200/50 
                 border border-slate-100 hover:shadow-xl hover:shadow-blue-500/10 
                 transition-all duration-300 flex flex-col items-center p-6 text-center h-full"
    >
      {/* Gradient Background Decoration */}
      <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-br from-blue-50 to-indigo-50/50 -z-10" />

      {/* Image Container */}
      <div className="relative w-28 h-28 mb-4 rounded-full p-1 bg-white shadow-sm ring-1 ring-slate-100">
        <div className="relative w-full h-full rounded-full overflow-hidden">
          <Image
            src={data.image || "/images/default-avatar.png"}
            alt={data.name_th}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-grow items-center">
        <h3 className="text-lg font-light text-slate-800 mb-1 leading-tight">
          {data.name_th}
        </h3>
        <p className="text-[11px] font-extralight text-slate-400 uppercase tracking-wide mb-3">
          {data.name_eng.replace(/[()]/g, "")}
        </p>

        {/* Role Badge */}
        <div className="mt-auto">
          <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-xs font-light rounded-full border border-blue-100">
            {data.role}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// 🧱 Advisor Card (Fixed UI with 150x200 image)
function AdvisorCard({ data }: { data: CardData }) {
  return (
    <motion.div
      whileHover={{ y: -8 }}
      className="flex flex-col items-center bg-white rounded-2xl shadow-lg shadow-slate-200/50 
                 border border-slate-100 p-6 text-center w-full max-w-[260px] transition-all duration-300"
    >
      {/* Image Area - Fixed Size 150x200 */}
      <div className="relative w-[150px] h-[200px] mb-4">
        {/* Decorative Shadow/Ring behind the image */}
        <div className="absolute inset-0 rounded-lg shadow-md bg-slate-200 translate-y-2 translate-x-2" />

        {/* Main Image Container */}
        <div className="relative w-full h-full rounded-lg overflow-hidden ring-4 ring-white shadow-sm z-10 bg-slate-100">
          <Image
            src={data.image || "/images/default-avatar.png"}
            alt={data.name_th}
            fill
            className="object-cover"
          />
        </div>
      </div>

      {/* Text Content (Moved below image for better fit) */}
      <div className="flex flex-col items-center z-20">
        {/* Role Badge */}
        <span className="inline-block px-3 py-1 mb-2 text-[10px] font-light tracking-wider text-blue-600 uppercase bg-blue-50 rounded-full border border-blue-100">
          {data.role}
        </span>

        {/* Name TH */}
        <h3 className="text-lg font-light text-slate-800 leading-tight mb-1">
          {data.name_th}
        </h3>

        {/* Name ENG */}
        <p className="text-[10px] font-light text-slate-400 uppercase tracking-wide">
          {data.name_eng.replace(/[()]/g, "")}
        </p>
      </div>
    </motion.div>
  );
}
