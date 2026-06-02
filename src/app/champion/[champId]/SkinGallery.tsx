"use client";

import { useState } from "react";

interface Skin { id: string; num: number; name: string; chromas: boolean }

interface Props { champId: string; skins: Skin[] }

export function SkinGallery({ champId, skins }: Props) {
  const [selected, setSelected] = useState(0);

  const skin = skins[selected];
  const imgUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champId}_${skin.num}.jpg`;

  return (
    <div className="skin-gallery">
      <div className="skin-main-wrap">
        <img
          src={imgUrl}
          alt={skin.name === "default" ? champId : skin.name}
          className="skin-main-img"
        />
        <p className="skin-name">{skin.name === "default" ? "Base" : skin.name}</p>
      </div>
      <div className="skin-thumbs">
        {skins.map((s, i) => (
          <button
            key={s.id}
            className={`skin-thumb ${selected === i ? "active" : ""}`}
            onClick={() => setSelected(i)}
            title={s.name === "default" ? "Base" : s.name}
          >
            <img
              src={`https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champId}_${s.num}.jpg`}
              alt={s.name}
              width={48}
              height={80}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
