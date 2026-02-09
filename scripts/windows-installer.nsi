!include "MUI2.nsh"

!ifndef APP_VERSION
!define APP_VERSION "1.0.1"
!endif

!ifdef ICON_PATH
!define MUI_ICON "${ICON_PATH}"
!define MUI_UNICON "${ICON_PATH}"
!else
!define MUI_ICON "assets\\icon.ico"
!define MUI_UNICON "assets\\icon.ico"
!endif

!define APP_NAME "Nexus"
Name "${APP_NAME} ${APP_VERSION}"
OutFile "release\\Nexus-Setup-${APP_VERSION}.exe"
InstallDir "$LOCALAPPDATA\\Nexus"
RequestExecutionLevel user
SetCompressor /SOLID lzma

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_LANGUAGE "PortugueseBR"

Section "Install"
SetShellVarContext current
SetOutPath "$INSTDIR"
File /r "release\\win-unpacked\\*"
CreateDirectory "$SMPROGRAMS\\Nexus"
CreateShortCut "$SMPROGRAMS\\Nexus\\Nexus.lnk" "$INSTDIR\\Nexus.exe" "" "$INSTDIR\\Nexus.exe" 0
CreateShortCut "$DESKTOP\\Nexus.lnk" "$INSTDIR\\Nexus.exe" "" "$INSTDIR\\Nexus.exe" 0
WriteUninstaller "$INSTDIR\\Uninstall.exe"
SectionEnd

Section "Uninstall"
SetShellVarContext current
Delete "$SMPROGRAMS\\Nexus\\Nexus.lnk"
RMDir "$SMPROGRAMS\\Nexus"
Delete "$DESKTOP\\Nexus.lnk"
RMDir /r "$INSTDIR"
SectionEnd
