-- Enforce one RetailerListing per (item, retailer) so concurrent saves upsert in place
-- instead of racing to create duplicate rows. Additive: matches @@unique([itemId, retailer]).
CREATE UNIQUE INDEX "RetailerListing_itemId_retailer_key" ON "RetailerListing"("itemId", "retailer");
