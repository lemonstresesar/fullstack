// Un middleware : une fonction (req, res, next). Elle observe, puis passe la main avec next().
export function journal(req, res, next) {
  const debut = performance.now();
  // « finish » : la réponse est partie ; on connaît alors le code HTTP et la durée
  res.on("finish", () => {
    const ms = (performance.now() - debut).toFixed(1);
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms} ms)`);
  });
  next();
}
