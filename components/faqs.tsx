export default function FAQs() {
    return (
        <section className="scroll-py-16 py-8 md:scroll-py-16 md:py-12">
            <div className="mx-auto max-w-5xl px-6">
                <div className="grid gap-y-12 px-2 lg:[grid-template-columns:1fr_auto]">
                    <div className="text-center lg:text-left">
                        <h2 className="mb-4 text-3xl font-semibold md:text-4xl text-foreground">
                            Frequently <br className="hidden lg:block" /> Asked <br className="hidden lg:block" />
                            Questions
                        </h2>
                        <p className="text-muted-foreground">Common questions about the Logistics Dashboard platform and features.</p>
                    </div>

                    <div className="divide-y divide-dashed sm:mx-auto sm:max-w-lg lg:mx-0">
                        <div className="pb-6">
                            <h3 className="font-medium text-foreground">How do I access my dashboard?</h3>
                            <p className="text-muted-foreground mt-4">You can access your dashboard by logging in with your client credentials. Each client has secure, role-based access to their specific shipment data and analytics.</p>

                            <ol className="list-outside list-decimal space-y-2 pl-4">
                                <li className="text-muted-foreground mt-4">Navigate to the login page and enter your email and password.</li>
                                <li className="text-muted-foreground mt-4">Your dashboard will automatically filter data based on your client credentials.</li>
                                <li className="text-muted-foreground mt-4">You can view shipments, financials, environmental metrics, and more from the main dashboard.</li>
                            </ol>
                        </div>
                        <div className="py-6">
                            <h3 className="font-medium text-foreground">What data can I see in the dashboard?</h3>
                            <p className="text-muted-foreground mt-4">The dashboard provides real-time shipment tracking, financial analytics (revenue, profit, costs), environmental metrics (CO2 emissions), mode insights (Sea, Air, Sea-Air), carrier distribution, and comprehensive KPIs.</p>
                        </div>
                        <div className="py-6">
                            <h3 className="font-medium text-foreground">Can I filter data by date range or mode?</h3>
                            <p className="text-muted-foreground my-4">Yes, the dashboard includes advanced filtering options. You can filter by:</p>
                            <ul className="list-outside list-disc space-y-2 pl-4">
                                <li className="text-muted-foreground">Date range using the calendar picker</li>
                                <li className="text-muted-foreground">Transportation mode (Sea/Air/Sea-Air), office location, client/provider</li>
                                <li className="text-muted-foreground">Search by shipment number, port, or carrier</li>
                            </ul>
                        </div>
                        <div className="py-6">
                            <h3 className="font-medium text-foreground">How is my data secured?</h3>
                            <p className="text-muted-foreground mt-4">The platform uses Supabase authentication for secure client access. Each client only sees their own data, and all connections are encrypted. Data is filtered server-side based on your credentials.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
