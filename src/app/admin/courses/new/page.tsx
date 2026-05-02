import { requireRole } from "@/server/auth-session";
import { NewCourseForm } from "./new-course-form";

export default async function NewCoursePage() {
  await requireRole("admin");
  return <NewCourseForm />;
}
