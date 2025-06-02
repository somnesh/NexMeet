import { LogOut, SunMoon, Moon, Sun } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import useTheme from "../contexts/Theme";
import { useEffect } from "react";

export function ProfileMenu({ setPageLoading }) {
  const { theme, darkTheme, lightTheme } = useTheme();

  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.name) {
      fetchUserData();
    }
  }, []);

  const fetchUserData = async () => {
    try {
      setPageLoading(true);
      const response = await API.get(`/oauth/profile`);
      const { avatar, id, name, email } = response.data;
      localStorage.setItem("avatar", avatar);
      localStorage.setItem("id", id);
      localStorage.setItem("name", name);
      localStorage.setItem("email", email);
    } catch (error) {
      console.error("Error fetching user data: ", error);
    } finally {
      setPageLoading(false);
    }
  };

  const switchTheme = (e) => {
    if (theme === "white") {
      darkTheme(e);
    } else {
      lightTheme(e);
    }
  };
  const handleLogout = async () => {
    try {
      setPageLoading(true);
      await API.post(`/auth/logout`);
      localStorage.removeItem("avatar");
      localStorage.removeItem("id");
      localStorage.removeItem("name");
      localStorage.removeItem("email");
      navigate("/login");
    } catch (error) {
      console.error("Error during logout: ", error);
    }
  };

  return (
    <>
      {localStorage.name && (
        <>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer hover:bg-[#e3e5e9] active:bg-[#d0d2d6] dark:hover:bg-[#414141] dark:active:bg-[#313131] active:scale-95 select-none px-1  sm:pr-1 py-1 rounded-full">
                <Avatar>
                  <AvatarImage src={localStorage.avatar} />
                  <AvatarFallback className={"bg-orange-500 stroke-black"}>
                    {localStorage.name[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-48 dark:bg-[#242526]  dark:text-white dark:border-none">
              <DropdownMenuGroup>
                <DropdownMenuSub className="dark:hover:text-black dark:focus:bg-[#414141]">
                  <DropdownMenuSubTrigger className="cursor-pointer dark:focus:bg-[#414141]">
                    <SunMoon className="mr-4 h-4 w-4 stroke-accent-foreground" />
                    <span>Themes</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent className="dark:bg-[#242526] dark:text-white dark:border-none">
                      {theme === "dark" && (
                        <>
                          <DropdownMenuItem
                            disabled={true}
                            className="cursor-pointer dark:text-white dark:bg-blue-400 data-[disabled]:opacity-100 mb-1"
                          >
                            <Moon className="mr-2 h-4 w-4 stroke-accent-foreground" />
                            <span>Dark Mode</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={switchTheme}
                            className="cursor-pointer dark:focus:bg-[#414141] dark:text-white"
                          >
                            <Sun className="mr-2 h-4 w-4 stroke-accent-foreground" />
                            <span>Light Mode</span>
                          </DropdownMenuItem>
                        </>
                      )}
                      {theme === "white" && (
                        <>
                          <DropdownMenuItem
                            onClick={switchTheme}
                            className="cursor-pointer dark:focus:bg-[#414141] dark:text-white mb-1"
                          >
                            <Moon className="mr-2 h-4 w-4 stroke-accent-foreground" />
                            <span>Dark Mode</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            disabled={true}
                            className="cursor-pointer text-white dark:focus:bg-[#414141] dark:text-white bg-blue-400 data-[disabled]:opacity-100"
                          >
                            <Sun className="mr-2 h-4 w-4 stroke-accent-foreground" />
                            <span>Light Mode</span>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              </DropdownMenuGroup>

              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer dark:focus:bg-[#414141] dark:text-white"
              >
                <LogOut className="mr-2 h-4 w-4 stroke-accent-foreground" />
                <span>Log out</span>
                <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </>
  );
}
