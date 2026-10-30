import AkathistReader from "./AkathistReader.jsx";
import { RevealWords } from "./Reveal.jsx";

const GOLD_TEXT = "bg-gradient-to-b from-[#c0392b] to-[#7a1a10] bg-clip-text text-transparent";

// Блок на главной: вход в читалку акафиста (AkathistReader).
export default function AkathistBanner() {
  return (
    <section className="w-full px-6 pb-6 pt-0 sm:px-10">
      {/* карточка не обрезает содержимое: флаг статуи выходит за её верхнюю кромку */}
      <div className="relative mx-auto max-w-[1700px] rounded-[28px] border border-[#e3d6cf] bg-gradient-to-r from-[#f6e8e5] via-[#fbf4f2] to-[#ffffff] px-7 py-10 sm:mt-[7rem] sm:min-h-[19rem] sm:px-14 sm:py-12">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
          <img src="/ornaments/corner.webp" alt="" className="absolute -bottom-6 -right-6 w-36 select-none opacity-90 sm:w-52" />
        </div>
        <img
          src="/ornaments/alexander.webp"
          alt=""
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-8 hidden h-[28rem] w-auto select-none drop-shadow-[0_18px_22px_rgba(60,40,15,0.35)] sm:block lg:left-14"
        />
        <div className="relative sm:pl-[14rem] lg:pl-[16rem]">
          <h2 style={{ textTransform: "none" }} className="font-slovic max-w-3xl text-3xl leading-tight sm:text-5xl">
            <RevealWords text="Акафист святому благоверному князю Александру Невскому" wordClassName={GOLD_TEXT} />
          </h2>
          <AkathistReader className="shimmer-gold mt-8 inline-flex h-12 cursor-pointer items-center rounded-full px-9 text-xs font-medium uppercase tracking-[0.22em] text-white shadow-lg">
            Читать акафист
          </AkathistReader>
        </div>
      </div>
    </section>
  );
}
