How to build a JVM bot

1. Add JvmBot.jar to your IDE project as a library (or just include JvmBot.jar in your CLASSPATH)
2. (See examples below) Create a class to extend Bot and a main method that calls BotDriver.playBot.
3. Execute the main method with 3 commandline parameters. [host port botName]
    

Java:
  
	import com.lucidsoftware.codekerfuffle.bot.*;
	import com.lucidsoftware.codekerfuffle.driver.BotDriver;

	public class ExampleJavaBot extends Bot {

	    private static BotFactory FACTORY = (BotData self, BoardState initialState) -> new ExampleJavaBot(self, initialState);

	    public static void main(String[] args) {
		BotDriver.playBot(ExampleJavaBot.FACTORY, args);
	    }

	    private ExampleJavaBot(BotData self, BoardState initialState) {
		super(self, initialState);
	    }

	    @Override
	    public Direction[] getMoves(BoardState state) {
		// `self.playerId` refers to yourself
		return new Direction[]{Direction.RIGHT, Direction.RIGHT, Direction.RIGHT, Direction.RIGHT, Direction.RIGHT};
	    }
	}

Scala:

	import com.lucidsoftware.codekerfuffle.bot.BotData
	import com.lucidsoftware.codekerfuffle.scala._

	object ExampleScalaBot {
	  def main(args: Array[String]): Unit = {
	    ScalaDriver.playBot(new ExampleScalaBot(_, _), args)
	  }
	}

	class ExampleScalaBot(self: BotData, initialState: BoardState) extends ScalaBot {
	  override def getMoves(state: BoardState): Array[Direction] = {
	    // `self.playerId` refers to yourself
	    return Array(Direction.Right, Direction.Right, Direction.Right, Direction.Right, Direction.Right)
	  }
	}


From sources:
  - There is an Intellij .iml file included in the repo. You can use this to re-create the project if need be.
