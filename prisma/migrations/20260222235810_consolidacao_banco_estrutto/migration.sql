-- CreateTable
CREATE TABLE "Etapa" (
    "id" SERIAL NOT NULL,
    "obraId" INTEGER NOT NULL,
    "phase" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" INTEGER NOT NULL,

    CONSTRAINT "Etapa_pkey" PRIMARY KEY ("id")
);
