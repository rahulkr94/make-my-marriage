import Image from "next/image";
import { Icon, Brand } from "@/components/marketing/brand";
import { Navigation, LaunchButton, GuestRsvpDemo, Faq } from "@/components/marketing/home-interactions";
export default function Home() {
    return (<>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <Navigation />
    <main id="main-content" className="w-full bg-surface"><div className="flex flex-col w-full">

    <section className="relative w-full overflow-hidden pt-12 md:pt-16 pb-16 lg:pb-24">

    <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-primary-fixed/20 via-surface-container-low to-transparent rounded-full blur-3xl pointer-events-none -z-10"></div>
    <div className="max-w-[1360px] mx-auto px-margin-mobile lg:px-margin">

    <div className="max-w-4xl mx-auto text-center flex flex-col items-center">

    <div className="inline-flex items-center gap-space-xs px-space-md py-1 bg-surface-container rounded-full shadow-sm mb-space-lg">
    <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
    <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">A calmer way to plan your wedding</span>
    </div>

    <h1 className="font-display text-headline-lg-mobile md:text-display text-on-surface font-serif tracking-tight leading-tight mb-space-lg">
          One place to plan every part of your wedding.
        </h1>

    <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl text-center mb-space-xl">
          Bring your events, guests, family, tasks, expenses, and memories together—from the first plan to the final celebration. Every celebration, beautifully organized.
        </p>

    <div className="flex flex-col sm:flex-row items-center gap-space-md w-full sm:w-auto">
    <LaunchButton className="w-full sm:w-auto inline-flex items-center justify-center bg-primary text-on-primary font-label-md text-label-md px-space-xl py-3.5 rounded-lg hover:bg-primary-container shadow-md transition-all text-center">
            Create your wedding
          </LaunchButton>
    <a className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs bg-surface-container-low text-on-surface font-label-md text-label-md px-space-lg py-3.5 rounded-lg hover:bg-surface-container shadow-sm transition-all text-center" href="#how-it-works">
    <span className="">See how it works</span>
    <Icon name="arrow_forward" className=" text-[18px] text-primary"/>
    </a>
    </div>

    <div className="flex flex-wrap items-center justify-center gap-x-space-md gap-y-1 mt-space-md text-on-surface-variant font-label-sm text-label-sm">
    <span className="">Made for couples</span>
    <span className="text-outline-variant">•</span>
    <span className="">Built for Indian weddings</span>
    <span className="text-outline-variant">•</span>
    <span className="">Guests join by link</span>
    </div>
    </div>

    <div id="preview" className="mt-space-xl pt-4"><p className="text-center text-body-sm text-on-surface-variant mb-4">A peek at your plans · Illustrative data, not a live wedding</p>
    <div className="relative bg-surface-container-low rounded-xl shadow-xl p-space-md sm:p-space-lg lg:p-space-xl overflow-visible">

    <div className="flex items-center justify-between pb-space-md mb-space-lg">
    <div className="flex items-center gap-space-sm">
    <span className="w-3 h-3 rounded-full bg-outline-variant/60"></span>
    <span className="w-3 h-3 rounded-full bg-outline-variant/60"></span>
    <span className="w-3 h-3 rounded-full bg-outline-variant/60"></span>
    <span className="ml-space-sm font-label-sm text-label-sm text-on-surface-variant hidden sm:inline">Ananya &amp; Rohan · Wedding preview</span>
    </div>
    <div className="flex items-center gap-space-xs px-space-sm py-1 bg-surface-container rounded font-label-sm text-label-sm text-on-surface-variant">
    <span className="w-2 h-2 rounded-full bg-secondary"></span>
    <span className="">Sample workspace</span>
    </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">

    <div className="lg:col-span-8 flex flex-col gap-space-lg">

    <div className="bg-surface rounded-lg p-space-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
    <div>
    <div className="flex items-center gap-space-sm mb-1">
    <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">Destination Wedding</span>
    <span className="text-outline-variant">•</span>
    <span className="font-label-sm text-label-sm text-on-surface-variant">Udaipur, Rajasthan</span>
    </div>
    <h2 className="font-headline-md text-headline-md font-serif text-on-surface">Ananya Sharma &amp; Rohan Varma</h2>
    </div>

    <div className="bg-surface-container-high px-space-md py-2.5 rounded-lg text-left sm:text-right shrink-0">
    <div className="font-label-md text-label-md text-primary font-bold">November 2027</div>
    <div className="font-body-sm text-body-sm text-on-surface-variant">Nov 22 – 25 · Udaipur</div>
    </div>
    </div>

    <div className="bg-surface rounded-lg p-space-lg shadow-sm">
    <div className="flex items-center justify-between mb-space-md">
    <h3 className="font-title-md text-title-md text-on-surface flex items-center gap-space-xs">
    <Icon name="calendar_today" className=" text-primary text-[20px]"/>
                    Celebration Schedule
                  </h3>
    <span className="font-label-sm text-label-sm text-on-surface-variant">4 Multi-day Events</span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">

    <div className="p-space-md bg-surface-container-low rounded-lg transition-all hover:bg-surface-container">
    <div className="flex items-center justify-between mb-1">
    <span className="font-label-sm text-label-sm uppercase font-semibold text-secondary">Nov 22 • 11:00 AM</span>
    <span className="font-label-sm text-label-sm text-on-surface-variant">120 guests</span>
    </div>
    <div className="font-title-md text-title-md text-on-surface">Haldi &amp; Mehendi</div>
    <div className="font-body-sm text-body-sm text-on-surface-variant">Poolside Courtyard • The Oberoi Udaivilas</div>
    </div>

    <div className="p-space-md bg-surface-container-low rounded-lg transition-all hover:bg-surface-container">
    <div className="flex items-center justify-between mb-1">
    <span className="font-label-sm text-label-sm uppercase font-semibold text-primary">Nov 23 • 07:30 PM</span>
    <span className="font-label-sm text-label-sm text-on-surface-variant">240 guests</span>
    </div>
    <div className="font-title-md text-title-md text-on-surface">Sangeet Night</div>
    <div className="font-body-sm text-body-sm text-on-surface-variant">The Grand Ballroom &amp; Terrace</div>
    </div>

    <div className="p-space-md bg-surface-container-low rounded-lg transition-all hover:bg-surface-container">
    <div className="flex items-center justify-between mb-1">
    <span className="font-label-sm text-label-sm uppercase font-semibold text-secondary">Nov 24 • 04:30 PM</span>
    <span className="font-label-sm text-label-sm text-on-surface-variant">280 guests</span>
    </div>
    <div className="font-title-md text-title-md text-on-surface">Wedding Ceremony</div>
    <div className="font-body-sm text-body-sm text-on-surface-variant">Sunset Mandap, Lakefront Pavilion</div>
    </div>

    <div className="p-space-md bg-surface-container-low rounded-lg transition-all hover:bg-surface-container">
    <div className="flex items-center justify-between mb-1">
    <span className="font-label-sm text-label-sm uppercase font-semibold text-on-surface-variant">Nov 25 • 08:00 PM</span>
    <span className="font-label-sm text-label-sm text-on-surface-variant">350 guests</span>
    </div>
    <div className="font-title-md text-title-md text-on-surface">Reception Dinner</div>
    <div className="font-body-sm text-body-sm text-on-surface-variant">Palace Lawns &amp; Banquet Courtyard</div>
    </div>
    </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">

    <div className="bg-surface rounded-lg p-space-lg shadow-sm flex flex-col justify-between">
    <div>
    <div className="flex items-center justify-between mb-space-md">
    <h3 className="font-title-md text-title-md text-on-surface flex items-center gap-space-xs">
    <Icon name="checklist" className=" text-secondary text-[20px]"/>
                        Priority Tasks
                      </h3>
    <span className="font-label-sm text-label-sm text-secondary font-semibold">18 / 24 Done</span>
    </div>
    <div className="space-y-space-sm">
    <div className="flex items-start gap-space-sm p-space-sm bg-surface-container-low rounded">
    <Icon name="check_circle" className=" text-secondary text-[18px] mt-0.5"/>
    <div className="min-w-0">
    <p className="font-body-sm text-body-sm text-on-surface-variant line-through truncate">Finalize Sangeet choreographers</p>
    <span className="font-label-sm text-label-sm text-secondary">Completed</span>
    </div>
    </div>
    <div className="flex items-start gap-space-sm p-space-sm bg-surface-container-low rounded">
    <Icon name="hourglass_top" className=" text-tertiary text-[18px] mt-0.5"/>
    <div className="min-w-0">
    <p className="font-body-sm text-body-sm text-on-surface font-medium truncate">Review Caterer tasting menu</p>
    <span className="font-label-sm text-label-sm text-tertiary">In Progress • Assigned to Maa</span>
    </div>
    </div>
    <div className="flex items-start gap-space-sm p-space-sm bg-surface-container-low rounded">
    <Icon name="radio_button_unchecked" className=" text-outline text-[18px] mt-0.5"/>
    <div className="min-w-0">
    <p className="font-body-sm text-body-sm text-on-surface truncate">Confirm dholak &amp; sound tech</p>
    <span className="font-label-sm text-label-sm text-on-surface-variant">Due Oct 15 • Assigned to Rohan</span>
    </div>
    </div>
    </div>
    </div>
    </div>

    <div className="bg-surface rounded-lg p-space-lg shadow-sm flex flex-col justify-between">
    <div>
    <div className="flex items-center justify-between mb-space-md">
    <h3 className="font-title-md text-title-md text-on-surface flex items-center gap-space-xs">
    <Icon name="account_balance_wallet" className=" text-primary text-[20px]"/>
                        Recorded Expenses
                      </h3>
    <span className="font-label-sm text-label-sm px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded font-medium">Sample data</span>
    </div>
    <div className="flex items-center gap-space-md mb-space-md">

    <div className="relative w-16 h-16 shrink-0">
    <svg aria-hidden="true" className="w-full h-full -rotate-90" viewBox="0 0 36 36">
    <path className="text-surface-container-highest" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5"></path>

    </svg>
    <div className="absolute inset-0 flex items-center justify-center font-label-sm text-label-sm font-bold text-on-surface">
                          INR
                        </div>
    </div>
    <div>
    <div className="font-headline-sm text-headline-sm text-on-surface font-semibold">₹24.8L <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">recorded</span></div>
    <p className="font-body-sm text-body-sm text-on-surface-variant">Actual expenses across 14 records</p>
    </div>
    </div>
    </div>
    <div className="pt-space-sm flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
    <span className="">Catering: ₹14.5L</span>
    <span className="">Other: ₹10.3L</span>
    </div>
    </div>
    </div>
    </div>

    <div className="lg:col-span-4 w-full">
    <div className="relative mx-auto max-w-[340px] bg-surface rounded-xl shadow-xl p-space-md overflow-hidden">

    <div className="flex items-center justify-between mb-space-md text-on-surface-variant pb-1">
    <span className="font-label-sm text-label-sm font-semibold">9:41</span>
    <div className="flex items-center gap-1">
    <Icon name="signal_cellular_alt" className=" text-[14px]"/>
    <Icon name="wifi" className=" text-[14px]"/>
    <Icon name="battery_full" className=" text-[14px]"/>
    </div>
    </div>

    <div className="text-center py-space-sm px-space-xs bg-surface-container-low rounded-lg mb-space-md">
    <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-semibold">Personal Invitation</span>
    <p className="font-headline-sm text-headline-sm font-serif text-on-surface mt-1">Ananya &amp; Rohan</p>
    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Warmly invite you to celebrate</p>
    </div>

    <div className="space-y-space-sm mb-space-md">
    <div className="p-space-sm bg-surface-container rounded-lg">
    <div className="flex items-center justify-between">
    <span className="font-label-sm text-label-sm text-secondary font-semibold">Nov 23, 2027</span>
    <span className="font-label-sm text-label-sm bg-secondary-container text-on-secondary-container px-1.5 py-0.5 rounded">Invited</span>
    </div>
    <div className="font-title-md text-title-md text-on-surface mt-0.5">Sangeet Night</div>
    <p className="font-body-sm text-body-sm text-on-surface-variant">Grand Ballroom • 07:30 PM</p>
    </div>
    <div className="p-space-sm bg-surface-container rounded-lg">
    <div className="flex items-center justify-between">
    <span className="font-label-sm text-label-sm text-secondary font-semibold">Nov 24, 2027</span>
    <span className="font-label-sm text-label-sm bg-secondary-container text-on-secondary-container px-1.5 py-0.5 rounded">Invited</span>
    </div>
    <div className="font-title-md text-title-md text-on-surface mt-0.5">Wedding &amp; Pheras</div>
    <p className="font-body-sm text-body-sm text-on-surface-variant">Sunset Mandap • 04:30 PM</p>
    </div>
    </div>

    <div className="bg-surface-container-high rounded-lg p-space-sm mb-space-md">
    <div className="flex items-center justify-between mb-2">
    <span className="font-label-sm text-label-sm font-semibold text-on-surface">Your RSVP Status</span>
    <span className="font-label-sm text-label-sm text-secondary flex items-center gap-1 font-bold">
    <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Confirmed
                    </span>
    </div>
    <div className="flex items-center justify-between bg-surface p-2 rounded mb-2">
    <span className="font-body-sm text-body-sm text-on-surface">Attending Guests</span>
    <div className="flex items-center gap-2">
    <span className="w-6 h-6 rounded bg-surface-container-high flex items-center justify-center font-bold text-on-surface text-body-sm">2</span>
    <span className="font-body-sm text-body-sm text-on-surface-variant">(Self + 1)</span>
    </div>
    </div>
    <a className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-space-sm bg-primary text-on-primary rounded font-label-sm text-label-sm hover:bg-primary-container transition-all" href="https://www.google.com/maps/search/?api=1&amp;query=The+Oberoi+Udaivilas+Udaipur" target="_blank" rel="noopener noreferrer" aria-label="View the sample venue on Google Maps (opens a new tab)">
    <Icon name="map" className=" text-[16px]"/>
    <span className="">Get Venue Directions</span>
    </a>
    </div>

    <div className="text-center font-label-sm text-label-sm text-on-surface-variant">
                  No app download or account needed
                </div>
    </div>
    </div>
    </div>
    </div>
    </div>
    </div>
    </section>

    <section className="w-full py-16 lg:py-24 bg-surface-container-low" id="features">
    <div className="max-w-[1360px] mx-auto px-margin-mobile lg:px-margin">

    <div className="max-w-2xl mb-space-xl">
    <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-semibold">A little less chaos</span>
    <h2 className="font-headline-lg text-headline-lg font-serif text-on-surface mt-1 tracking-tight">
          All the moving parts, working together.
        </h2>
    <p className="font-body-lg text-body-lg text-on-surface-variant mt-space-sm">
          Indian weddings have multiple ceremonies, circles of guests, and shared responsibilities. Bring the scattered lists and conversations into one thoughtful workspace.
        </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">

    <div className="bg-surface rounded-xl p-space-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
    <div>
    <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary mb-space-lg">
    <Icon name="event_repeat" className=" text-[24px]"/>
    </div>
    <h3 className="font-headline-sm text-headline-sm font-serif text-on-surface mb-space-sm">
              Events &amp; Multi-day Venues
            </h3>
    <p className="font-body-md text-body-md text-on-surface-variant">
              Give every celebration its own schedule, venue, address, and directions—from Haldi and Mehendi to the final reception.
            </p>
    </div>
    <a href="#preview" className="mt-space-lg pt-space-md flex items-center gap-space-xs text-primary font-label-md text-label-md"><span>Explore ceremony scheduling</span><Icon name="arrow_forward" className=" text-[16px]"/></a>
    </div>

    <div className="bg-surface rounded-xl p-space-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
    <div>
    <div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center text-on-secondary-container mb-space-lg">
    <Icon name="mark_email_read" className=" text-[24px]"/>
    </div>
    <h3 className="font-headline-sm text-headline-sm font-serif text-on-surface mb-space-sm">
              Guests, Invitations &amp; RSVP
            </h3>
    <p className="font-body-md text-body-md text-on-surface-variant">
              Invite each guest to the right events with a personal link or QR code. Keep guest responses and expected attendee totals clearly separate.
            </p>
    </div>
    <a href="#guest-experience" className="mt-space-lg pt-space-md flex items-center gap-space-xs text-primary font-label-md text-label-md"><span>Learn about smart RSVPs</span><Icon name="arrow_forward" className=" text-[16px]"/></a>
    </div>

    <div className="bg-surface rounded-xl p-space-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
    <div>
    <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary mb-space-lg">
    <Icon name="diversity_3" className=" text-[24px]"/>
    </div>
    <h3 className="font-headline-sm text-headline-sm font-serif text-on-surface mb-space-sm">
              Tasks &amp; Family Collaboration
            </h3>
    <p className="font-body-md text-body-md text-on-surface-variant">
              Delegate responsibilities to siblings, parents, and planners with clear permissions—without messy group chats or forgotten promises.
            </p>
    </div>
    <a href="#family" className="mt-space-lg pt-space-md flex items-center gap-space-xs text-primary font-label-md text-label-md"><span>See coordination roles</span><Icon name="arrow_forward" className=" text-[16px]"/></a>
    </div>

    <div className="md:col-span-2 bg-surface rounded-xl p-space-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-space-lg">
    <div className="max-w-md">
    <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary mb-space-lg">
    <Icon name="payments" className=" text-[24px]"/>
    </div>
    <h3 className="font-headline-sm text-headline-sm font-serif text-on-surface mb-space-sm">
                Expenses, Advances &amp; Vendor Ledger
              </h3>
    <p className="font-body-md text-body-md text-on-surface-variant">
                Keep track of negotiated rates, advance token payments, pending installments, and actual expenses across catering, décor, photography, makeup, and sound.
              </p>
    </div>

    <div className="bg-surface-container-low rounded-lg p-space-md w-full md:w-auto md:min-w-[260px] text-body-sm">
    <div className="font-label-sm text-label-sm uppercase text-on-surface-variant mb-2">Sample expense records</div>
    <div className="flex justify-between py-1 font-medium text-on-surface">
    <span className="">The Vintage Frame (Photo)</span>
    <span className="">₹1,50,000</span>
    </div>
    <div className="flex justify-between py-1 text-on-surface-variant">
    <span className="">Sufi Sounds (Sound tech)</span>
    <span className="">₹65,000</span>
    </div>
    <div className="flex justify-between py-1 text-on-surface-variant">
    <span className="">Bloom &amp; Brass Décor</span>
    <span className="">₹2,80,000</span>
    </div>
    </div>
    </div>
    <a href="#preview" className="mt-space-lg pt-space-md flex items-center gap-space-xs text-primary font-label-md text-label-md"><span>Explore financial controls</span><Icon name="arrow_forward" className=" text-[16px]"/></a>
    </div>

    <div className="bg-surface rounded-xl p-space-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
    <div>
    <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary mb-space-lg">
    <Icon name="photo_library" className=" text-[24px]"/>
    </div>
    <h3 className="font-headline-sm text-headline-sm font-serif text-on-surface mb-space-sm">
              Shared Photo Archive
            </h3>
    <p className="font-body-md text-body-md text-on-surface-variant">
              Collect high-res moments from guests with couple admin approval before photos appear on the gallery shared by a revocable link.
            </p>
    </div>
    <a href="#gallery" className="mt-space-lg pt-space-md flex items-center gap-space-xs text-primary font-label-md text-label-md"><span>View archival workflow</span><Icon name="arrow_forward" className=" text-[16px]"/></a>
    </div>
    </div>
    </div>
    </section>

    <section className="w-full py-16 lg:py-24 bg-surface" id="how-it-works">
    <div className="max-w-[1360px] mx-auto px-margin-mobile lg:px-margin">
    <div className="text-center max-w-2xl mx-auto mb-space-xl">
    <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-semibold">Simplicity by Design</span>
    <h2 className="font-headline-lg text-headline-lg font-serif text-on-surface mt-1 tracking-tight">
          How it works in four calm steps
        </h2>
    <p className="font-body-lg text-body-lg text-on-surface-variant mt-space-sm">
          From your first plan to the final celebration, take it one thoughtful step at a time.
        </p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-lg">

    <div className="bg-surface-container-low rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
    <div>
    <div className="font-serif text-headline-lg text-primary/30 mb-space-sm">01</div>
    <h3 className="font-title-lg text-title-lg text-on-surface mb-space-xs">Create your wedding</h3>
    <p className="font-body-sm text-body-sm text-on-surface-variant">
              Start with your names, wedding date, venue, and time zone. Your celebration gets a place of its own.
            </p>
    </div>
    <div className="mt-space-lg pt-space-sm font-label-sm text-label-sm text-secondary font-semibold">
            One wedding, one workspace
          </div>
    </div>

    <div className="bg-surface-container-low rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
    <div>
    <div className="font-serif text-headline-lg text-primary/30 mb-space-sm">02</div>
    <h3 className="font-title-lg text-title-lg text-on-surface mb-space-xs">Add events &amp; invite family</h3>
    <p className="font-body-sm text-body-sm text-on-surface-variant">
              Define schedules and assign roles to close family members to share the planning load with specific permissions.
            </p>
    </div>
    <div className="mt-space-lg pt-space-sm font-label-sm text-label-sm text-secondary font-semibold">
            Everyone knows their role
          </div>
    </div>

    <div className="bg-surface-container-low rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
    <div>
    <div className="font-serif text-headline-lg text-primary/30 mb-space-sm">03</div>
    <h3 className="font-title-lg text-title-lg text-on-surface mb-space-xs">Send personalized invitations</h3>
    <p className="font-body-sm text-body-sm text-on-surface-variant">
              Generate customized guest links or QR codes that display only their specific events without app downloads.
            </p>
    </div>
    <div className="mt-space-lg pt-space-sm font-label-sm text-label-sm text-secondary font-semibold">
            No guest account needed
          </div>
    </div>

    <div className="bg-surface-container-low rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
    <div>
    <div className="font-serif text-headline-lg text-primary/30 mb-space-sm">04</div>
    <h3 className="font-title-lg text-title-lg text-on-surface mb-space-xs">Stay organized as plans evolve</h3>
    <p className="font-body-sm text-body-sm text-on-surface-variant">
              Enjoy live attendee tallies, vendor expense tracking, and quiet peace of mind right up until the final farewell.
            </p>
    </div>
    <div className="mt-space-lg pt-space-sm font-label-sm text-label-sm text-secondary font-semibold">
            A clear view of your plans
          </div>
    </div>
    </div>
    </div>
    </section>

    <section className="w-full py-16 lg:py-24 bg-surface-container-low" id="guest-experience">
    <div className="max-w-[1360px] mx-auto px-margin-mobile lg:px-margin">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center">

    <div className="lg:col-span-6 flex flex-col gap-space-md">
    <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-semibold">Guest Journey</span>
    <h2 className="font-headline-lg text-headline-lg font-serif text-on-surface tracking-tight">
            Effortless for your guests. Zero friction.
          </h2>
    <p className="font-body-lg text-body-lg text-on-surface-variant">
            Guests shouldn’t have to register accounts, install third-party apps, or remember passwords just to confirm their presence at your wedding.
          </p>
    <div className="space-y-space-md mt-space-sm">
    <div className="flex items-start gap-space-md">
    <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 text-primary">
    <Icon name="filter_alt" className=" text-[18px]"/>
    </div>
    <div>
    <h3 className="font-title-md text-title-md text-on-surface">Targeted Ceremony Visibility</h3>
    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Guests only see the ceremonies they are personally invited to—preventing awkwardness across private and broad gatherings.</p>
    </div>
    </div>
    <div className="flex items-start gap-space-md">
    <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 text-primary">
    <Icon name="explore" className=" text-[18px]"/>
    </div>
    <div>
    <h3 className="font-title-md text-title-md text-on-surface">Directions for every celebration</h3>
    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Find each event’s venue and address in one place, with a directions link to help guests get there.</p>
    </div>
    </div>
    <div className="flex items-start gap-space-md">
    <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 text-primary">
    <Icon name="check_box" className=" text-[18px]"/>
    </div>
    <div>
    <h3 className="font-title-md text-title-md text-on-surface">Actual Headcounts vs. Responses</h3>
    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">See who has replied and how many people are attending each event, with clear counts for planning.</p>
    </div>
    </div>
    </div>
    </div>

    <div className="lg:col-span-6 flex justify-center">
    <div className="w-full max-w-md bg-surface rounded-xl shadow-xl p-space-lg overflow-hidden">

    <div className="flex items-center justify-between pb-space-sm mb-space-md">
    <div className="flex items-center gap-space-xs">
    <Icon name="mark_email_unread" className=" text-primary text-[20px]"/>
    <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Sample guest invitation</span>
    </div>
    <span className="font-label-sm text-label-sm px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded">Mobile Browser View</span>
    </div>

    <div className="bg-surface-container-low rounded-lg p-space-md text-center mb-space-md">
    <div className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-bold">You are warmly invited</div>
    <div className="font-headline-sm text-headline-sm font-serif text-on-surface mt-1">Devika &amp; Sameer Kapoor</div>
    <div className="font-body-sm text-body-sm text-on-surface-variant mt-1">Sample invitation · Try the RSVP below</div>
    </div>

    <div className="space-y-space-sm mb-space-md">
    <div className="p-space-md bg-surface-container rounded-lg">
    <div className="flex items-center justify-between">
    <span className="font-label-sm text-label-sm uppercase font-bold text-primary">Sangeet &amp; Musical Night</span>
    <span className="font-label-sm text-label-sm text-on-surface-variant">07:00 PM</span>
    </div>
    <p className="font-body-sm text-body-sm text-on-surface mt-1">The Taj Mahal Palace, Gateway Room</p>
    <div className="mt-2 inline-flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant bg-surface px-2 py-1 rounded">
    <Icon name="styler" className=" text-[14px] text-secondary"/>
                  Event details in one place
                </div>
    </div>

    <div className="p-space-sm bg-surface-container-low rounded-lg flex items-center justify-between">
    <div className="flex items-center gap-space-sm">
    <Icon name="pin_drop" className=" text-primary text-[20px]"/>
    <span className="font-body-sm text-body-sm text-on-surface">Apollo Bunder, Colaba, Mumbai</span>
    </div>
    <a className="text-label-sm text-primary font-bold px-2 py-3" href="https://www.google.com/maps/search/?api=1&amp;query=The+Taj+Mahal+Palace+Apollo+Bunder+Mumbai" target="_blank" rel="noopener noreferrer" aria-label="View the sample Mumbai venue on Google Maps (opens a new tab)">Navigate</a>
    </div>
    </div>

    <GuestRsvpDemo />
    </div>
    </div>
    </div>
    </div>
    </section>

    <section id="family" className="w-full py-16 lg:py-24 bg-surface">
    <div className="max-w-[1360px] mx-auto px-margin-mobile lg:px-margin">
    <div className="max-w-2xl mb-space-xl">
    <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-semibold">Collaborative Harmony</span>
    <h2 className="font-headline-lg text-headline-lg font-serif text-on-surface mt-1 tracking-tight">
          Family-first collaboration designed for Indian weddings
        </h2>
    <p className="font-body-lg text-body-lg text-on-surface-variant mt-space-sm">
          Big weddings take a village. Make My Marriage lets you share the work respectfully with clear admin, manager, and member roles so everyone knows their role without confusion.
        </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">

    <div className="bg-surface-container-low rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
    <div>
    <div className="flex items-center justify-between mb-space-md">
    <span className="font-label-sm text-label-sm px-2 py-0.5 bg-primary-fixed text-on-primary-fixed rounded font-semibold uppercase">Full Admin</span>
    <Icon name="admin_panel_settings" className=" text-primary text-[20px]"/>
    </div>
    <h3 className="font-title-lg text-title-lg text-on-surface">Bride &amp; Groom</h3>
    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Admin access to wedding settings, members, events, guests, expenses, and photo approvals.</p>
    <div className="mt-space-md p-space-sm bg-surface rounded">
    <div className="font-label-sm text-label-sm text-on-surface-variant uppercase font-medium">Recent Actions</div>
    <div className="font-body-sm text-body-sm text-on-surface mt-1">Updated the wedding venue and approved family photos</div>
    </div>
    </div>
    <div className="mt-space-md font-label-sm text-label-sm text-primary font-medium">Example: the couple as admins</div>
    </div>

    <div className="bg-surface-container-low rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
    <div>
    <div className="flex items-center justify-between mb-space-md">
    <span className="font-label-sm text-label-sm px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded font-semibold uppercase">Managers</span>
    <Icon name="restaurant" className=" text-secondary text-[20px]"/>
    </div>
    <h3 className="font-title-lg text-title-lg text-on-surface">Chachi &amp; Tauji</h3>
    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Manage events, guests, tasks, vendors, and expenses. Wedding settings and membership stay with the admins.</p>
    <div className="mt-space-md p-space-sm bg-surface rounded">
    <div className="font-label-sm text-label-sm text-on-surface-variant uppercase font-medium">Recent Actions</div>
    <div className="font-body-sm text-body-sm text-on-surface mt-1">Confirmed midnight snack buffet for Sangeet</div>
    </div>
    </div>
    <div className="mt-space-md font-label-sm text-label-sm text-secondary font-medium">Example: trusted family managers</div>
    </div>

    <div className="bg-surface-container-low rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
    <div>
    <div className="flex items-center justify-between mb-space-md">
    <span className="font-label-sm text-label-sm px-2 py-0.5 bg-surface-container-high text-on-surface-variant rounded font-semibold uppercase">Members</span>
    <Icon name="celebration" className=" text-tertiary text-[20px]"/>
    </div>
    <h3 className="font-title-lg text-title-lg text-on-surface">Sister of Bride &amp; Cousins</h3>
    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">See shared event details, update their assigned tasks, and contribute photos to the wedding gallery.</p>
    <div className="mt-space-md p-space-sm bg-surface rounded">
    <div className="font-label-sm text-label-sm text-on-surface-variant uppercase font-medium">Recent Actions</div>
    <div className="font-body-sm text-body-sm text-on-surface mt-1">Completed their assigned Sangeet rehearsal task</div>
    </div>
    </div>
    <div className="mt-space-md font-label-sm text-label-sm text-tertiary font-medium">Example: relatives with assigned tasks</div>
    </div>
    </div>
    </div>
    </section>

    <section id="gallery" className="w-full py-16 lg:py-24 bg-surface-container-low">
    <div className="max-w-[1360px] mx-auto px-margin-mobile lg:px-margin">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md mb-space-xl">
    <div className="max-w-xl">
    <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-semibold">Crowdsourced Memories</span>
    <h2 className="font-headline-lg text-headline-lg font-serif text-on-surface mt-1 tracking-tight">
            Memories from every angle, curated by you.
          </h2>
    <p className="font-body-lg text-body-lg text-on-surface-variant mt-space-sm">
            Collect the moments your guests capture. Review submissions before approved photos appear in your shared gallery.
          </p>
    </div>
    <div className="inline-flex items-center gap-space-xs px-space-md py-2 bg-surface rounded-lg shadow-sm">
    <Icon name="verified" className=" text-secondary text-[20px]"/>
    <span className="font-label-sm text-label-sm text-on-surface font-semibold">Photos reviewed before sharing</span>
    </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">

    <div className="bg-surface rounded-xl p-space-sm shadow-sm flex flex-col gap-space-xs">
    <Image className="w-full h-64 object-cover rounded-lg" alt="Bride smiling during a wedding celebration" src="/images/home/haldi.jpg" width={512} height={286} sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 25vw"/>
    <div className="flex items-center justify-between px-space-xs pt-1">
    <span className="font-label-sm text-label-sm text-on-surface font-medium">Haldi · Sample photo</span>
    <span className="font-label-sm text-label-sm text-secondary">Approved</span>
    </div>
    </div>

    <div className="bg-surface rounded-xl p-space-sm shadow-sm flex flex-col gap-space-xs">
    <Image className="w-full h-64 object-cover rounded-lg" alt="A warmly lit wedding venue at dusk" src="/images/home/venue.jpg" width={512} height={286} sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 25vw"/>
    <div className="flex items-center justify-between px-space-xs pt-1">
    <span className="font-label-sm text-label-sm text-on-surface font-medium">The venue · Sample photo</span>
    <span className="font-label-sm text-label-sm text-secondary">Approved</span>
    </div>
    </div>

    <div className="bg-surface rounded-xl p-space-sm shadow-sm flex flex-col gap-space-xs">
    <Image className="w-full h-64 object-cover rounded-lg" alt="Family celebrating together at a Sangeet" src="/images/home/sangeet.jpg" width={512} height={286} sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 25vw"/>
    <div className="flex items-center justify-between px-space-xs pt-1">
    <span className="font-label-sm text-label-sm text-on-surface font-medium">Sangeet · Sample photo</span>
    <span className="font-label-sm text-label-sm text-secondary">Approved</span>
    </div>
    </div>

    <div className="bg-surface rounded-xl p-space-sm shadow-sm flex flex-col gap-space-xs">
    <Image className="w-full h-64 object-cover rounded-lg" alt="Henna-adorned hands holding flowers" src="/images/home/mehendi.jpg" width={512} height={286} sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 25vw"/>
    <div className="flex items-center justify-between px-space-xs pt-1">
    <span className="font-label-sm text-label-sm text-on-surface font-medium">Mehendi · Sample photo</span>
    <span className="font-label-sm text-label-sm text-secondary">Approved</span>
    </div>
    </div>
    </div>
    </div>
    </section>

    <section className="w-full py-16 lg:py-24 bg-surface" id="faq">
    <div className="max-w-[1360px] mx-auto px-margin-mobile lg:px-margin">
    <div className="max-w-2xl mx-auto text-center mb-space-xl">
    <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-semibold">Honest Answers</span>
    <h2 className="font-headline-lg text-headline-lg font-serif text-on-surface mt-1 tracking-tight">
          Frequently asked questions
        </h2>
    <p className="font-body-lg text-body-lg text-on-surface-variant mt-space-sm">
          Everything you need to know about setting up your workspace and inviting guests.
        </p>
    </div>
    <Faq />
    </div>
    </section>

    <section id="getting-started" className="w-full py-20 lg:py-28 bg-surface-container">
    <div className="max-w-[1360px] mx-auto px-margin-mobile lg:px-margin text-center">
    <div className="max-w-3xl mx-auto flex flex-col items-center">
    <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-semibold mb-space-sm">Begin Your Journey</span>
    <h2 className="font-display text-headline-lg-mobile md:text-display font-serif text-on-surface tracking-tight mb-space-md">
          Start planning a celebration you can actually enjoy.
        </h2>
    <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mb-space-xl">
          A thoughtful home for your plans, your people, and all the little things that make this celebration yours.
        </p>
    <LaunchButton className="inline-flex items-center justify-center bg-primary text-on-primary font-label-md text-label-md px-space-xl py-4 rounded-lg hover:bg-primary-container shadow-lg transition-all">
          Create your wedding
        </LaunchButton>
    <div className="flex flex-wrap items-center justify-center gap-space-md mt-space-md text-on-surface-variant font-label-sm text-label-sm">
    <span className="">Your wedding, thoughtfully organized</span>
    <span className="text-outline-variant">•</span>
    <span className="">Accounts are now available</span>
    </div>
    </div>
    </div>
    </section>
    </div></main>
    <footer className="bg-surface-container-low border-t border-outline-variant/40">
    <div className="max-w-[1360px] mx-auto px-margin-mobile lg:px-margin py-10 flex flex-col lg:flex-row gap-8 justify-between lg:items-center">
    <div><Brand /><p className="text-body-sm text-on-surface-variant mt-3">Every celebration, beautifully organized.</p></div>
    <nav aria-label="Footer" className="flex flex-wrap gap-6 text-body-sm"><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#guest-experience">Guest experience</a><a href="#faq">FAQ</a></nav>
    <p className="text-label-sm text-on-surface-variant">© {new Date().getFullYear()} Make My Marriage</p>
    </div></footer>
    </>);
}
