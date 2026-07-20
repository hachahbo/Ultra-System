import Link from "next/link";
import { LogoIcon } from "@/components/site/logo-icon";
import type { Restaurant, ResolvedTheme } from "@/lib/types";

export function Footer({
  restaurant,
  theme,
}: {
  restaurant: Restaurant;
  theme: ResolvedTheme;
}) {
  const base = `/${restaurant.slug}`;

  return (
    <div className="mt-auto pt-24 sm:pt-32 lg:pt-40">
      <footer className="relative pt-24 pb-8 text-sm text-muted-foreground sm:pt-32">
        {/* Newsletter Box */}
        <div className="absolute left-4 right-4 top-0 -translate-y-1/2 mx-auto max-w-5xl z-10">
          <div className="relative overflow-hidden rounded-3xl shadow-xl">
            <div
              className={
                theme.hero_image_urls[0]
                  ? "absolute inset-0 bg-cover bg-center bg-no-repeat"
                  : "absolute inset-0 bg-gradient-to-br from-primary to-primary/60"
              }
              style={
                theme.hero_image_urls[0]
                  ? { backgroundImage: `url('${theme.hero_image_urls[0]}')` }
                  : undefined
              }
            />
          {/* Dark overlay removed */}
          <div className="relative z-10 px-6 py-12 text-center sm:px-12 sm:py-16">
            <h2 className="mx-auto max-w-xl font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Get Our Promo Code by Subscribing To our Newsletter
            </h2>
            <form className="mx-auto mt-6 flex max-w-md rounded-full bg-white p-1.5 shadow-sm">
              <input
                type="email"
                placeholder="Enter your email"
                className="min-w-0 flex-auto rounded-full bg-transparent px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                required
              />
              <button
                type="submit"
                className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pt-16 sm:pt-20 lg:px-8 relative z-0">
        {/* Decorative Background Watermark */}
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] opacity-[0.03]">
          <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full stroke-foreground stroke-1">
            <circle cx="100" cy="100" r="90" />
            <circle cx="100" cy="100" r="70" strokeDasharray="4 4" />
            <path d="M50 150 Q20 80 100 20 Q180 80 150 150" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M100 20 L100 120" strokeLinecap="round" />
            <path d="M50 150 Q30 180 80 190" strokeLinecap="round" />
          </svg>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-8 relative z-10">
          {/* Column 1: Logo, Text, Hours */}
          <div className="space-y-6">
            <div className="flex items-center min-w-0 mb-2">
              <LogoIcon className="w-32 sm:w-40 h-auto" />
            </div>
            <p className="text-muted-foreground line-clamp-3 leading-relaxed">
              {theme.about_body || "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore."}
              {" "}
              <Link href={`${base}/about`} className="text-card-foreground underline hover:text-primary font-medium text-xs ml-1">
                Learn more
              </Link>
            </p>
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-card-foreground mb-3">Opening Hours</h3>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                {restaurant.hours ? (
                  <p>{restaurant.hours}</p>
                ) : (
                  <>
                    <div className="flex justify-between max-w-[240px]">
                      <span className="font-medium text-card-foreground/80">Monday - Friday</span>
                      <span>8:00 am to 9:00 pm</span>
                    </div>
                    <div className="flex justify-between max-w-[240px]">
                      <span className="font-medium text-card-foreground/80">Saturday</span>
                      <span>8:00 am to 9:00 pm</span>
                    </div>
                    <div className="flex justify-between max-w-[240px]">
                      <span className="font-medium text-card-foreground/80">Sunday</span>
                      <span>CLOSED</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Column 2: Navigation */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-card-foreground mb-6 mt-1">Navigation</h3>
            <ul className="space-y-4 text-xs font-medium text-muted-foreground">
              <li><Link href={`${base}/menu`} className="hover:text-primary transition-colors">Menu</Link></li>
              <li><Link href={`${base}/about`} className="hover:text-primary transition-colors">About us</Link></li>
              <li><Link href={`${base}/contact`} className="hover:text-primary transition-colors">Contact us</Link></li>
              <li><Link href={`${base}/menu`} className="hover:text-primary transition-colors">Main dishes</Link></li>
            </ul>
          </div>

          {/* Column 3: Follow Us — icons only render for URLs the operator
              has actually set (0019); no dead href="#" links. */}
          {(theme.social_facebook_url || theme.social_instagram_url || theme.social_twitter_url) && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-card-foreground mb-6 mt-1">Follow Us</h3>
              <div className="flex gap-4">
                {theme.social_facebook_url && (
                  <a href={theme.social_facebook_url} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all bg-card">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                  </a>
                )}
                {theme.social_instagram_url && (
                  <a href={theme.social_instagram_url} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all bg-card">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                  </a>
                )}
                {theme.social_twitter_url && (
                  <a href={theme.social_twitter_url} target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all bg-card">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="mt-20 flex flex-col items-center justify-between border-t border-border pt-8 pb-4 sm:flex-row relative z-10">
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide">
            © {new Date().getFullYear()} {restaurant.name}. All Right Reserved. Designed by Isaac
          </p>
          <div className="mt-4 flex gap-6 text-[11px] font-medium text-muted-foreground sm:mt-0">
            <a href="#" className="hover:text-card-foreground transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-card-foreground transition-colors">Privacy Policy</a>
          </div>
        </div>
      </div>
    </footer>
    </div>
  );
}
