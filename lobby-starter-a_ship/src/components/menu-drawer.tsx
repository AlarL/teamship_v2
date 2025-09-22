import { playerActions } from '@/state/actions/player-actions';
import type { PlayerState } from '@/state/stores/player-store';
import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';

const MenuDrawer: React.FC = () => {
	const [isOpen, setIsOpen] = React.useState(false);

	const setCurrentView = (view: PlayerState['currentView']) => {
		playerActions.setCurrentView(view);
		setIsOpen(false);
	};

	const handleExitClick = () => {
		playerActions.leaveLobby();
		setIsOpen(false);
	};

	return (
		<DrawerPrimitive.Root
			open={isOpen}
			onOpenChange={setIsOpen}
			direction="right"
		>
			<DrawerPrimitive.Trigger asChild>
				<button className="btn btn-circle">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
					>
						<path
							fill="currentColor"
							d="M4 18q-.425 0-.712-.288T3 17t.288-.712T4 16h16q.425 0 .713.288T21 17t-.288.713T20 18zm0-5q-.425 0-.712-.288T3 12t.288-.712T4 11h16q.425 0 .713.288T21 12t-.288.713T20 13zm0-5q-.425 0-.712-.288T3 7t.288-.712T4 6h16q.425 0 .713.288T21 7t-.288.713T20 8z"
						/>
					</svg>
					<span className="sr-only">Open menu drawer</span>
				</button>
			</DrawerPrimitive.Trigger>

			<DrawerPrimitive.Portal>
				<DrawerPrimitive.Overlay className="fixed inset-0 z-20 bg-black/40" />
				<DrawerPrimitive.Content
					className="fixed top-2 right-2 bottom-2 z-20 flex w-[310px] outline-none"
					// The gap between the edge of the screen and the drawer is 8px in this case.
					style={
						{ '--initial-transform': 'calc(100% + 8px)' } as React.CSSProperties
					}
				>
					<div className="flex h-full w-full grow flex-col rounded-[16px] bg-zinc-50 p-5">
						<div className="mx-auto w-full">
							<DrawerPrimitive.Title className="sr-only">
								Menu
							</DrawerPrimitive.Title>

							<DrawerPrimitive.Description className="sr-only">
								Menu drawer content
							</DrawerPrimitive.Description>

							<ul className="menu w-full gap-2">
								<li>
									<button onClick={() => setCurrentView('role-select')}>Roles</button>
								</li>
								<li>
									<button onClick={() => setCurrentView('legend')}>Legend</button>
								</li>
								{/* Play and Spectate removed from menu */}
								<div className="divider my-0" />
								<li>
									<button className="text-error" onClick={handleExitClick}>
										Exit Lobby
									</button>
								</li>
							</ul>
						</div>
					</div>
				</DrawerPrimitive.Content>
			</DrawerPrimitive.Portal>
		</DrawerPrimitive.Root>
	);
};

export default MenuDrawer;
