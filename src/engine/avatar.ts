export type SkinTone = '#FFDBB4' | '#E8B88A' | '#C68642' | '#8D5524' | '#5C3317' | '#F5D0A9';
export type HairStyle = 'short' | 'long' | 'curly' | 'buzz' | 'ponytail' | 'mohawk' | 'bald';
export type HairColor = '#2C1B0E' | '#8B4513' | '#DAA520' | '#B22222' | '#1A1A2E' | '#F5F5DC' | '#FF6B35';
export type EyeStyle = 'round' | 'narrow' | 'wide' | 'sleepy';
export type FaceShape = 'round' | 'oval' | 'square';
export type Accessory = 'none' | 'glasses' | 'sunglasses' | 'earring' | 'hat' | 'bandana';
export type ClothingColor = '#2563eb' | '#dc2626' | '#16a34a' | '#9333ea' | '#ea580c' | '#0d9488' | '#db2777' | '#854d0e' | '#334155' | '#f5f5f4';
export type ClothingStyle = 'tshirt' | 'hoodie' | 'shirt' | 'tank';

export interface AvatarConfig {
  skinTone: SkinTone;
  hairStyle: HairStyle;
  hairColor: HairColor;
  eyeStyle: EyeStyle;
  faceShape: FaceShape;
  accessory: Accessory;
  clothingColor: ClothingColor;
  clothingStyle: ClothingStyle;
}

export const SKIN_TONES: SkinTone[] = ['#FFDBB4', '#F5D0A9', '#E8B88A', '#C68642', '#8D5524', '#5C3317'];
export const HAIR_STYLES: HairStyle[] = ['short', 'long', 'curly', 'buzz', 'ponytail', 'mohawk', 'bald'];
export const HAIR_COLORS: HairColor[] = ['#2C1B0E', '#8B4513', '#DAA520', '#B22222', '#1A1A2E', '#F5F5DC', '#FF6B35'];
export const EYE_STYLES: EyeStyle[] = ['round', 'narrow', 'wide', 'sleepy'];
export const FACE_SHAPES: FaceShape[] = ['round', 'oval', 'square'];
export const ACCESSORIES: Accessory[] = ['none', 'glasses', 'sunglasses', 'earring', 'hat', 'bandana'];
export const CLOTHING_COLORS: ClothingColor[] = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0d9488', '#db2777', '#854d0e', '#334155', '#f5f5f4'];
export const CLOTHING_STYLES: ClothingStyle[] = ['tshirt', 'hoodie', 'shirt', 'tank'];

export function randomAvatar(): AvatarConfig {
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  return {
    skinTone: pick(SKIN_TONES),
    hairStyle: pick(HAIR_STYLES),
    hairColor: pick(HAIR_COLORS),
    eyeStyle: pick(EYE_STYLES),
    faceShape: pick(FACE_SHAPES),
    accessory: pick(ACCESSORIES),
    clothingColor: pick(CLOTHING_COLORS),
    clothingStyle: pick(CLOTHING_STYLES),
  };
}

export const DEFAULT_AVATARS: Record<string, AvatarConfig> = {
  npc_1:  { skinTone: '#FFDBB4', hairStyle: 'short',    hairColor: '#2C1B0E', eyeStyle: 'round',  faceShape: 'oval',   accessory: 'none',       clothingColor: '#2563eb', clothingStyle: 'tshirt' },
  npc_2:  { skinTone: '#F5D0A9', hairStyle: 'long',     hairColor: '#8B4513', eyeStyle: 'wide',   faceShape: 'round',  accessory: 'earring',    clothingColor: '#db2777', clothingStyle: 'shirt' },
  npc_3:  { skinTone: '#E8B88A', hairStyle: 'ponytail', hairColor: '#DAA520', eyeStyle: 'narrow',  faceShape: 'oval',   accessory: 'glasses',    clothingColor: '#16a34a', clothingStyle: 'shirt' },
  npc_4:  { skinTone: '#FFDBB4', hairStyle: 'buzz',     hairColor: '#1A1A2E', eyeStyle: 'narrow',  faceShape: 'square', accessory: 'sunglasses', clothingColor: '#334155', clothingStyle: 'hoodie' },
  npc_5:  { skinTone: '#F5D0A9', hairStyle: 'curly',    hairColor: '#B22222', eyeStyle: 'round',  faceShape: 'round',  accessory: 'none',       clothingColor: '#ea580c', clothingStyle: 'tshirt' },
  npc_6:  { skinTone: '#E8B88A', hairStyle: 'long',     hairColor: '#1A1A2E', eyeStyle: 'wide',   faceShape: 'oval',   accessory: 'glasses',    clothingColor: '#9333ea', clothingStyle: 'hoodie' },
  npc_7:  { skinTone: '#C68642', hairStyle: 'bald',     hairColor: '#2C1B0E', eyeStyle: 'sleepy', faceShape: 'round',  accessory: 'none',       clothingColor: '#dc2626', clothingStyle: 'tank' },
  npc_8:  { skinTone: '#FFDBB4', hairStyle: 'mohawk',   hairColor: '#FF6B35', eyeStyle: 'round',  faceShape: 'oval',   accessory: 'earring',    clothingColor: '#854d0e', clothingStyle: 'tshirt' },
  npc_9:  { skinTone: '#F5D0A9', hairStyle: 'ponytail', hairColor: '#DAA520', eyeStyle: 'wide',   faceShape: 'round',  accessory: 'bandana',    clothingColor: '#0d9488', clothingStyle: 'tank' },
  npc_10: { skinTone: '#8D5524', hairStyle: 'short',    hairColor: '#2C1B0E', eyeStyle: 'narrow',  faceShape: 'square', accessory: 'hat',        clothingColor: '#334155', clothingStyle: 'hoodie' },
};
