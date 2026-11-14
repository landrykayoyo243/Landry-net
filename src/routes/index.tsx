        <section id="contact" className="relative overflow-hidden bg-hero py-20 text-ink-foreground md:py-28">
          <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />
          <div className={`${container} relative text-center`}>
            <Reveal className="mx-auto max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <Sparkles size={12} /> Travaillons ensemble
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal leading-tight text-white">
                Construisons une collaboration{" "}
                <span className="italic font-serif text-primary-glow">durable</span>.
              </h2>
              <p className="mt-5 text-base sm:text-lg leading-relaxed text-ink-foreground/75 max-w-2xl mx-auto">
                Vous avez un réseau à sécuriser, un système à fiabiliser ou une application web à lancer ? Je vous accompagne avec des solutions fiables, simples et pensées pour durer.
              </p>
              <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/contact" className={btnPrimary}>
                  Échanger sur votre projet <ArrowRight size={16} />
                </Link>
                <a
                  href={profile.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className={btnGhostDark}
                >
                  <MessageSquare size={16} /> Écrire sur WhatsApp
                </a>
              </div>
            </Reveal>
          </div>
        </section>
