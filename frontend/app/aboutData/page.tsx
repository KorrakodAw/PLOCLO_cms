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
    <div className="max-w-[1100px] h-full flex flex-col mx-auto">
      <motion.h1
        className="text-4xl font-light mb-8 text-center tracking-wide"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {t("about") || "About Our Team"}
      </motion.h1>

      {/* 🔹 Team Section */}

      <div className="flex flex-col gap-12 mt-6">
        {[version1, version2, version3].map((version, index) => (
          <div key={index} className="flex flex-col gap-4">
            <SectionTitle title={`Version ${index + 1}`} />
            <motion.div
              className="flex flex-wrap justify-center gap-8"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{
                hidden: {},
                visible: {
                  transition: { staggerChildren: 0.15 },
                },
              }}
            >
              {version.map((person) => (
                <motion.div
                  key={person.id}
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

      {/* 🔹 Advisors Section */}
      <SectionTitle title="Advisors" />
      <motion.div
        className="flex flex-wrap justify-center gap-8 mt-6"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        {advisors.map((advisor) => (
          <AdvisorCard key={advisor.id} data={advisor} />
        ))}
      </motion.div>
    </div>
  );
}

// 🧱 Helper: Section Header
function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mt-10 mb-4 text-center">
      <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
      <div className="w-20 h-0.5 bg-blue-500 mx-auto mt-2 rounded-full"></div>
    </div>
  );
}

// 🧱 Member Card
function PersonCard({ data }: { data: CardData }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      className="w-72 h-96 bg-linear-to-br from-white/80 to-blue-50/50 
                 backdrop-blur-md border border-blue-100 rounded-2xl 
                 shadow-md hover:shadow-blue-200 transition-all duration-300 p-5 text-center"
    >
      <div className="relative w-32 h-40 mx-auto rounded-xl overflow-hidden shadow-lg">
        <Image
          src={data.image || "/images/default-avatar.png"}
          alt={data.name_th}
          fill
          className="object-cover"
        />
      </div>

      <h3 className="mt-4 text-lg font-semibold text-gray-800">
        {data.name_th}
      </h3>
      <p className="text-sm text-gray-500">{data.name_eng}</p>
      <p className="mt-2 text-blue-600 font-medium text-sm">{data.role}</p>
    </motion.div>
  );
}

// 🧱 Advisor Card
function AdvisorCard({ data }: { data: CardData }) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.05 }}
      className="w-90 h-96 bg-linear-to-br from-blue-50 to-white/70 
                 border border-blue-200 rounded-2xl shadow-md 
                 p-5 text-center transition-all duration-300"
    >
      <div className="relative w-32 h-40 mx-auto rounded-xl overflow-hidden shadow-lg ring-4 ring-blue-300/30">
        <Image
          src={data.image || "/images/default-avatar.png"}
          alt={data.name_th}
          fill
          className="object-cover"
        />
      </div>

      <h3 className="mt-4 text-xl font-semibold text-blue-700">
        {data.name_th}
      </h3>
      <p className="text-sm text-blue-500">{data.name_eng}</p>
      <p className="mt-2 text-blue-400 font-medium text-sm">{data.role}</p>
    </motion.div>
  );
}
