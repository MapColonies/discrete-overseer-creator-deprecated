export const getUtcNow = (): Date => {
    const date = new Date();
    const nowUtc = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds()
    );
    const utcDate = new Date(nowUtc);
    console.log(`inner ${utcDate.toISOString()}`)
    return utcDate;
  };
