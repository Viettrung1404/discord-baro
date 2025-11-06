import { NavigationSidebar } from "@/components/navigation/navigation-sidebar";
import { NotificationListener } from "@/components/notification-listener";
import { Toaster } from "sonner";

const MainLayout = async(
    { children }: { children: React.ReactNode }
) => {
    return (
        <div className="h-screen">
            <NotificationListener />
            <Toaster richColors />
            <div className="hidden md:flex h-screen w-[72px]
            z-30 flex-col fixed inset-y-0">
                <NavigationSidebar
            />
            </div>
            <main className="md:pl-[72px] h-full">
                {children}
            </main>
        </div>
    );
}
 
export default MainLayout;