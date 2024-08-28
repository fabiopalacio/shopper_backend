-- CreateTable
CREATE TABLE "client" (
    "measure_uuid" TEXT NOT NULL PRIMARY KEY,
    "image_url" TEXT NOT NULL,
    "customer_code" TEXT NOT NULL,
    "measure_datetime" INTEGER NOT NULL,
    "measure_type" TEXT NOT NULL,
    "measure_value" REAL NOT NULL,
    "has_confirmed" BOOLEAN NOT NULL DEFAULT false
);
