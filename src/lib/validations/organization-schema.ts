import { z } from "zod";

export const ORGANIZATION_TYPE_VALUES = ["school", "corporate"] as const;
export type OrganizationTypeValue = (typeof ORGANIZATION_TYPE_VALUES)[number];

export const createTrialOrganizationSchema = z.object({
  schoolName: z
    .string()
    .trim()
    .min(2, "Название должно содержать минимум 2 символа."),
  org_type: z.enum(ORGANIZATION_TYPE_VALUES, {
    message: "Выберите тип организации.",
  }),
});
