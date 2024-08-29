-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_client" (
    "measure_uuid" TEXT NOT NULL PRIMARY KEY,
    "image_url" TEXT NOT NULL,
    "customer_code" TEXT NOT NULL,
    "measure_datetime" TEXT NOT NULL,
    "measure_type" TEXT NOT NULL,
    "measure_value" REAL,
    "has_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "month" INTEGER NOT NULL
);
INSERT INTO "new_client" ("customer_code", "has_confirmed", "image_url", "measure_datetime", "measure_type", "measure_uuid", "measure_value", "month") SELECT "customer_code", "has_confirmed", "image_url", "measure_datetime", "measure_type", "measure_uuid", "measure_value", "month" FROM "client";
DROP TABLE "client";
ALTER TABLE "new_client" RENAME TO "client";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
