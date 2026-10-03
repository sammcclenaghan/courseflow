import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "@/lib/utils";

const Drawer = ({
	shouldScaleBackground = true,
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
	<DrawerPrimitive.Root
		shouldScaleBackground={shouldScaleBackground}
		{...props}
	/>
);
Drawer.displayName = "Drawer";

const DrawerOverlay = React.forwardRef<
	React.ComponentRef<typeof DrawerPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<DrawerPrimitive.Overlay
		ref={ref}
		className={cn("fixed inset-0 z-50 bg-black/40", className)}
		{...props}
	/>
));
DrawerOverlay.displayName = "DrawerOverlay";

const DrawerContent = React.forwardRef<
	React.ComponentRef<typeof DrawerPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
	<DrawerPrimitive.Portal>
		<DrawerOverlay />
		<DrawerPrimitive.Content
			ref={ref}
			className={cn(
				"fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-2xl border bg-background",
				className,
			)}
			{...props}
		>
			<div className="mx-auto mt-3 mb-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/20" />
			{children}
		</DrawerPrimitive.Content>
	</DrawerPrimitive.Portal>
));
DrawerContent.displayName = "DrawerContent";

const DrawerTitle = React.forwardRef<
	React.ComponentRef<typeof DrawerPrimitive.Title>,
	React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
	<DrawerPrimitive.Title
		ref={ref}
		className={cn(
			"font-semibold leading-none text-lg tracking-tight",
			className,
		)}
		{...props}
	/>
));
DrawerTitle.displayName = "DrawerTitle";

export { Drawer, DrawerContent, DrawerTitle };
