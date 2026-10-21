const imageFiles = import.meta.glob("/src/assets/images/memorial/*.{jpg,jpeg,png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

function imageNamed(fragment: string): string | undefined {
  return Object.entries(imageFiles).find(([path]) => path.includes(fragment))?.[1];
}

export const memorialImages = {
  entrance: imageNamed("loi-vao"),
  marker: imageNamed("bien-chi-dan"),
};
