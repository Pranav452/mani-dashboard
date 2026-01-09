import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function CallToAction() {
    return (
        <section className="py-8 md:py-12">
            <div className="mx-auto max-w-5xl rounded-3xl border px-6 py-8 md:py-12 lg:py-16">
                <div className="text-center">
                    <h2 className="text-balance text-4xl font-semibold lg:text-5xl text-foreground">Ready to Get Started?</h2>
                    <p className="mt-4 text-muted-foreground">Access your logistics dashboard and start tracking your shipments in real-time.</p>

                    <div className="mt-12 flex flex-wrap justify-center gap-4">
                        <Button
                            asChild
                            size="lg">
                            <Link href="/login">
                                <span>Client Login</span>
                            </Link>
                        </Button>

                        <Button
                            asChild
                            size="lg"
                            variant="outline">
                            <Link href="/dashboard">
                                <span>View Demo</span>
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    )
}
