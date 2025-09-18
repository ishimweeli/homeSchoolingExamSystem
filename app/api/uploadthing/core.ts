import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
 
const f = createUploadthing();
 
export const ourFileRouter = {
  // Question images for exam creation
  questionImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.id) throw new Error("Unauthorized");
      if (!['TEACHER', 'PARENT', 'ADMIN'].includes(session.user.role)) {
        throw new Error("Only teachers/parents can upload question images");
      }
 
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Question image upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);
      
      return { uploadedBy: metadata.userId };
    }),

  // Student assignment submissions
  assignmentSubmission: f({ 
    image: { maxFileSize: "8MB", maxFileCount: 5 },
    pdf: { maxFileSize: "16MB", maxFileCount: 3 }
  })
    .middleware(async ({ req }) => {
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.id) throw new Error("Unauthorized");
 
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Assignment submission upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);
      
      return { uploadedBy: metadata.userId };
    }),

  // Study materials and resources
  studyMaterial: f({
    image: { maxFileSize: "8MB", maxFileCount: 10 },
    pdf: { maxFileSize: "32MB", maxFileCount: 5 },
    video: { maxFileSize: "64MB", maxFileCount: 2 }
  })
    .middleware(async ({ req }) => {
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.id) throw new Error("Unauthorized");
      if (!['TEACHER', 'PARENT', 'ADMIN'].includes(session.user.role)) {
        throw new Error("Only teachers/parents can upload study materials");
      }
 
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Study material upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);
      
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;
 
export type OurFileRouter = typeof ourFileRouter;