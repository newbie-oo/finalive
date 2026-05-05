import "server-only";

export interface CourseAdminDeps {
  createCourse: (input: {
    slug: string;
    title: string;
    summary: string;
    descriptionMd?: string;
    coverMediaId?: string;
    isFree: boolean;
    price: string;
    ownerUserId: string;
  }) => Promise<string>;
  updateCourse: (
    courseId: string,
    updates: {
      slug?: string;
      title?: string;
      summary?: string;
      price?: string;
      isFree?: boolean;
      status?: string;
    },
  ) => Promise<void>;
}

export interface CreateCourseInput {
  slug: string;
  title: string;
  summary: string;
  description?: string;
  coverMediaId?: string;
  price?: string;
  isFree: boolean;
  status?: string;
  ownerUserId: string;
}

/**
 * Admin course creation with price normalization.
 * The repo enforces the bidirectional invariant; this service just ensures
 * the action passes a valid price.
 */
export class CourseAdminService {
  constructor(private deps: CourseAdminDeps) {}

  async create(input: CreateCourseInput): Promise<string> {
    const price = input.isFree ? "0.00" : (input.price ?? "0.00");
    return this.deps.createCourse({
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      descriptionMd: input.description || undefined,
      coverMediaId: input.coverMediaId || undefined,
      isFree: input.isFree,
      price,
      ownerUserId: input.ownerUserId,
    });
  }

  async update(
    courseId: string,
    updates: Partial<Omit<CreateCourseInput, "ownerUserId">>,
  ): Promise<void> {
    await this.deps.updateCourse(courseId, {
      ...(updates.slug !== undefined && { slug: updates.slug }),
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.summary !== undefined && { summary: updates.summary }),
      ...(updates.price !== undefined && { price: updates.price }),
      ...(updates.isFree !== undefined && { isFree: updates.isFree }),
      ...(updates.status !== undefined && { status: updates.status }),
    });
  }
}
