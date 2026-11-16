// Dedupes landlord scope lookups that several loaders fire together.
// Requests are shared only while they are in flight, so later refreshes hit the database again.
(function () {
  const inflight = new Map();

  function share(key, factory) {
    const existing = inflight.get(key);
    if (existing) return existing;

    const job = Promise.resolve()
      .then(factory)
      .finally(() => {
        if (inflight.get(key) === job) inflight.delete(key);
      });

    inflight.set(key, job);
    return job;
  }

  function landlordApartmentIds(client, landlordId) {
    if (!client || !landlordId) return Promise.resolve({ data: [], error: null });
    return share("apartments:" + landlordId, () =>
      client.from("apartments").select("id").eq("landlord_id", landlordId)
    );
  }

  function landlordContractIds(client, landlordId) {
    if (!client || !landlordId) return Promise.resolve({ data: [], error: null });
    return share("contracts:" + landlordId, async () => {
      const apartments = await landlordApartmentIds(client, landlordId);
      if (apartments.error || !apartments.data || apartments.data.length === 0) {
        return { data: [], error: apartments.error || null };
      }
      const apartmentIds = apartments.data.map((row) => row.id);
      return client.from("contracts").select("id").in("apartment_id", apartmentIds);
    });
  }

  window.DbScope = { landlordApartmentIds, landlordContractIds };
})();
