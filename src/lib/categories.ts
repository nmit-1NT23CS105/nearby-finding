import { CategoryOption } from "@/lib/types";

export const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: "shops", label: "Shops", overpassClauses: ["[shop]"], keyword: "shop" },
  { id: "hospitals", label: "Hospitals", overpassClauses: ["[amenity=hospital]", "[healthcare=hospital]"] },
  { id: "restaurants", label: "Restaurants", overpassClauses: ["[amenity=restaurant]"] },
  {
    id: "food",
    label: "Food Places",
    overpassClauses: [
      "[amenity~\"fast_food|cafe|food_court|restaurant|ice_cream\",i]",
      "[shop~\"bakery|confectionery\",i]"
    ],
    keyword: "food"
  },
  { id: "pharmacies", label: "Pharmacies", overpassClauses: ["[amenity=pharmacy]", "[shop=chemist]"] },
  { id: "schools", label: "Schools", overpassClauses: ["[amenity=school]"] },
  { id: "atms", label: "ATMs", overpassClauses: ["[amenity=atm]"] },
  {
    id: "clinics",
    label: "Clinics",
    overpassClauses: ["[amenity=clinic]", "[healthcare=clinic]", "[healthcare=doctor]"],
    keyword: "clinic"
  },
  { id: "petrol", label: "Petrol Pumps", overpassClauses: ["[amenity=fuel]"] },
  { id: "supermarkets", label: "Supermarkets", overpassClauses: ["[shop=supermarket]"] },
  { id: "police", label: "Police Stations", overpassClauses: ["[amenity=police]"] },
  { id: "hotels", label: "Hotels", overpassClauses: ["[tourism~\"hotel|motel|guest_house\",i]"] }
];

export const EMERGENCY_CATEGORY_IDS = ["hospitals", "clinics", "pharmacies", "police"];

export function getCategoryById(id: string) {
  return CATEGORY_OPTIONS.find((category) => category.id === id);
}
